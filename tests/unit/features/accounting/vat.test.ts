import { describe, expect, it } from "vitest";
import { DEFAULT_VAT_RATE, splitVat } from "@/features/accounting/domain/vat";

describe("splitVat", () => {
  it("splits a VAT-inclusive gross into net + vat at the default rate", () => {
    expect(splitVat(121, 0.21)).toEqual({ gross: 121, net: 100, vat: 21 });
  });

  it("rounds net and vat to the given fraction digits, keeping net+vat=gross", () => {
    const result = splitVat(100, 0.21);
    expect(result).toEqual({ gross: 100, net: 82.64, vat: 17.36 });
    expect(
      Math.round((result.net + result.vat) * 100) / 100,
    ).toBe(result.gross);
  });

  it("treats a zero rate as exempt — net equals gross, vat is 0", () => {
    expect(splitVat(50, 0)).toEqual({ gross: 50, net: 50, vat: 0 });
  });

  it("treats a negative rate as exempt, same as zero", () => {
    expect(splitVat(50, -1)).toEqual({ gross: 50, net: 50, vat: 0 });
  });

  it("supports a non-default rate", () => {
    expect(splitVat(100, 0.1)).toEqual({ gross: 100, net: 90.91, vat: 9.09 });
  });

  it("supports 0 fraction digits", () => {
    expect(splitVat(121, 0.21, 0)).toEqual({ gross: 121, net: 100, vat: 21 });
  });

  it("returns gross unchanged and vat 0 for a non-finite gross", () => {
    expect(splitVat(Number.NaN, 0.21)).toEqual({
      gross: Number.NaN,
      net: Number.NaN,
      vat: 0,
    });
  });

  it("exposes DEFAULT_VAT_RATE as 0.21", () => {
    expect(DEFAULT_VAT_RATE).toBe(0.21);
  });
});
