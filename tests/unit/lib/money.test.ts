import { describe, expect, it } from "vitest";
import {
  DEFAULT_MONEY_FORMAT,
  formatMoney,
  moneyFormatter,
} from "@/lib/money";

// ICU separates the amount from the € sign with a non-breaking space; assert
// on a space-normalized string so the intent stays readable.
const norm = (s: string) => s.replace(/\s/g, " ");

describe("formatMoney", () => {
  it("formats EUR / es-ES with the currency's own fraction digits", () => {
    expect(norm(formatMoney(19, { currency: "EUR", locale: "es-ES" }))).toBe("19,00 €");
    expect(norm(formatMoney(6.5, { currency: "EUR", locale: "es-ES" }))).toBe("6,50 €");
    expect(norm(formatMoney(0, { currency: "EUR", locale: "es-ES" }))).toBe("0,00 €");
  });

  it("is deterministic per explicit (currency, locale) — different currency changes output", () => {
    const eur = formatMoney(1234.5, { currency: "EUR", locale: "es-ES" });
    const usd = formatMoney(1234.5, { currency: "USD", locale: "en-US" });
    expect(usd).toBe("$1,234.50");
    expect(eur).not.toBe(usd);
  });

  it("formats large numbers with locale grouping", () => {
    expect(formatMoney(30000, { currency: "ARS", locale: "es-AR" })).toContain(
      "30.000",
    );
  });

  it("has no hardcoded fallback — the format argument is always honoured", () => {
    expect(formatMoney(10, { currency: "GBP", locale: "en-GB" })).toBe("£10.00");
  });

  it("DEFAULT_MONEY_FORMAT is EUR / es-ES", () => {
    expect(DEFAULT_MONEY_FORMAT).toEqual({ currency: "EUR", locale: "es-ES" });
  });

  it("moneyFormatter memoizes one Intl.NumberFormat per (locale, currency)", () => {
    const a = moneyFormatter({ currency: "EUR", locale: "es-ES" });
    const b = moneyFormatter({ currency: "EUR", locale: "es-ES" });
    const c = moneyFormatter({ currency: "USD", locale: "es-ES" });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
