/**
 * The ONE money formatter for the whole app (spec: clinic-currency R2).
 * Pure — no React, no Supabase. Every component / page / action / helper that
 * renders money for display goes through `formatMoney`; no other code path
 * declares an `Intl.NumberFormat` with a `currency` option.
 *
 * Fraction digits follow the currency's own default (EUR -> 2). The old
 * `maximumFractionDigits: 0` is intentionally dropped: fine for ARS at 30000,
 * wrong for a EUR tariff at 6,50 €.
 */
export type MoneyFormat = { currency: string; locale: string };

export const DEFAULT_MONEY_FORMAT: MoneyFormat = {
  currency: "EUR",
  locale: "es-ES",
};

const cache = new Map<string, Intl.NumberFormat>();

/** Memoized `Intl.NumberFormat` — one instance per `${locale}|${currency}`. */
export function moneyFormatter(format: MoneyFormat): Intl.NumberFormat {
  const key = `${format.locale}|${format.currency}`;
  let formatter = cache.get(key);
  if (!formatter) {
    formatter = new Intl.NumberFormat(format.locale, {
      style: "currency",
      currency: format.currency,
    });
    cache.set(key, formatter);
  }
  return formatter;
}

export function formatMoney(amount: number, format: MoneyFormat): string {
  return moneyFormatter(format).format(amount);
}
