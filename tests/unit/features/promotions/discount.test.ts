import { describe, expect, it } from "vitest";
import {
  applyDiscount,
  bonusPrice,
  bonusSessions,
  currencyFractionDigits,
} from "@/features/promotions/domain/discount";

describe("applyDiscount", () => {
  it("computes a percent discount rounded to the currency's fraction digits", () => {
    const result = applyDiscount({
      listTotal: 120,
      kind: "percent",
      value: 10,
      fractionDigits: 2,
    });
    expect(result).toEqual({ ok: true, total: 108, discountAmount: 12 });
  });

  it("rounds a percent discount to whole units for a zero-decimal currency", () => {
    const result = applyDiscount({
      listTotal: 30000,
      kind: "percent",
      value: 12.5,
      fractionDigits: 0,
    });
    expect(result).toEqual({ ok: true, total: 26250, discountAmount: 3750 });
  });

  it("applies a fixed discount verbatim (rounded to fraction digits)", () => {
    const result = applyDiscount({
      listTotal: 120,
      kind: "fixed",
      value: 15.567,
      fractionDigits: 2,
    });
    expect(result).toEqual({ ok: true, total: 104.43, discountAmount: 15.57 });
  });

  it("allows a discount that leaves exactly 0.01 (119.99 on 120)", () => {
    const result = applyDiscount({
      listTotal: 120,
      kind: "fixed",
      value: 119.99,
      fractionDigits: 2,
    });
    expect(result).toEqual({ ok: true, total: 0.01, discountAmount: 119.99 });
  });

  it("rejects a discount that would drop the total below 0.01", () => {
    expect(
      applyDiscount({ listTotal: 120, kind: "fixed", value: 120, fractionDigits: 2 }),
    ).toEqual({ ok: false, reason: "exceeds" });
    expect(
      applyDiscount({ listTotal: 120, kind: "percent", value: 100, fractionDigits: 2 }),
    ).toEqual({ ok: false, reason: "exceeds" });
  });

  it("rejects a non-positive value", () => {
    expect(
      applyDiscount({ listTotal: 120, kind: "fixed", value: 0, fractionDigits: 2 }),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      applyDiscount({ listTotal: 120, kind: "percent", value: -5, fractionDigits: 2 }),
    ).toEqual({ ok: false, reason: "invalid" });
  });

  it("rejects a percent value above 100", () => {
    expect(
      applyDiscount({ listTotal: 120, kind: "percent", value: 150, fractionDigits: 2 }),
    ).toEqual({ ok: false, reason: "invalid" });
  });
});

describe("currencyFractionDigits", () => {
  it("returns 2 for EUR", () => {
    expect(currencyFractionDigits("EUR")).toBe(2);
  });

  it("returns 0 for a zero-decimal currency (CLP)", () => {
    expect(currencyFractionDigits("CLP")).toBe(0);
  });

  it("falls back to 2 for an unknown currency", () => {
    expect(currencyFractionDigits("ZZZ")).toBe(2);
  });
});

describe("bonusSessions / bonusPrice", () => {
  it("adds the bonus sessions to the default count (6 + 2 = 8)", () => {
    expect(bonusSessions(6, 2)).toBe(8);
  });

  it("uses the override price when present, else the bono price", () => {
    expect(bonusPrice(60000, 55000)).toBe(55000);
    expect(bonusPrice(60000, null)).toBe(60000);
  });
});
