/**
 * Pure discount math for per-sale manual discounts and discount codes
 * (spec: "sale-discounts / Discount math pure & currency-rounded"). No I/O:
 * the caller resolves the clinic currency's fraction digits via
 * `currencyFractionDigits` and passes them in. Postgres still owns the real
 * money invariant (`sales_money_identity` + `total > 0` CHECKs); this is the
 * app-layer pre-check so the operator sees a Spanish error instead of a
 * raw constraint violation.
 */
export type DiscountKind = "percent" | "fixed";

export type ApplyDiscountInput = {
  listTotal: number;
  kind: DiscountKind;
  value: number;
  fractionDigits: number;
};

export type ApplyDiscountResult =
  | { ok: true; total: number; discountAmount: number }
  | { ok: false; reason: "exceeds" | "invalid" };

function round(amount: number, fractionDigits: number): number {
  const factor = 10 ** fractionDigits;
  return Math.round((amount + Number.EPSILON) * factor) / factor;
}

export function applyDiscount({
  listTotal,
  kind,
  value,
  fractionDigits,
}: ApplyDiscountInput): ApplyDiscountResult {
  if (!Number.isFinite(value) || value <= 0) {
    return { ok: false, reason: "invalid" };
  }
  if (kind === "percent" && value > 100) {
    return { ok: false, reason: "invalid" };
  }

  const rawAmount = kind === "percent" ? (listTotal * value) / 100 : value;
  const discountAmount = round(rawAmount, fractionDigits);

  if (discountAmount < 0) {
    return { ok: false, reason: "invalid" };
  }

  const total = round(listTotal - discountAmount, fractionDigits);
  if (total < 0.01) {
    return { ok: false, reason: "exceeds" };
  }

  return { ok: true, total, discountAmount };
}

/**
 * Currencies with no minor unit (CLDR "zero-decimal" set) — a discount in one
 * of these rounds to whole units. Every other currency rounds to 2 decimals,
 * which covers EUR/USD/ARS and is the safe default for anything unlisted.
 * Kept as an explicit list so this stays pure (no `Intl` currency instance,
 * which the `no-hardcoded-currency` guard forbids outside `src/lib/money.ts`).
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
  "BIF", "CLP", "DJF", "GNF", "ISK", "JPY", "KMF", "KRW", "PYG", "RWF",
  "UGX", "VND", "VUV", "XAF", "XOF", "XPF",
]);

/** Fraction digits for the clinic's configured currency (EUR -> 2, CLP -> 0). */
export function currencyFractionDigits(currency: string): number {
  return ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 0 : 2;
}

/** Bonus-session math: `default_sessions + bonus_sessions` (spec: "6+2" => 8). */
export function bonusSessions(defaultSessions: number, bonus: number): number {
  return defaultSessions + bonus;
}

/** Promotion item price: the override when set, otherwise the tariff bono price. */
export function bonusPrice(
  bonoPrice: number,
  overridePrice: number | null,
): number {
  return overridePrice ?? bonoPrice;
}
