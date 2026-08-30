import { E2E_CURRENCY, E2E_LOCALE } from "./global-setup";

/**
 * Formats money exactly the way the app does after Slice B — through the
 * clinic's configured (currency, locale), which `global-setup` seeds to
 * `E2E_CURRENCY` / `E2E_LOCALE`. Mirrors `src/lib/money.ts#formatMoney` so
 * the golden-path / caja assertions check the real rendered string instead
 * of a loose `$`-anchored regex.
 */
const formatter = new Intl.NumberFormat(E2E_LOCALE, {
  style: "currency",
  currency: E2E_CURRENCY,
});

export function formatMoney(amount: number): string {
  return formatter.format(amount);
}

/**
 * Inverse of `formatMoney` for the seeded (currency, locale): turns a rendered
 * money string back into a number. Handles `es-ES` grouping (`.`) and decimal
 * (`,`) — e.g. `"15.000,00 €"` -> `15000`.
 */
export function parseMoney(text: string): number {
  const cleaned = text
    .replace(/[^\d.,-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(cleaned);
}
