import { describe, expect, it } from "vitest";
import {
  buildSalesByType,
  buildVatBreakdown,
  classifySale,
} from "@/features/accounting/domain/income-report";

describe("classifySale", () => {
  it("classifies a sale with a client package as bono", () => {
    expect(classifySale({ clientPackageId: "pkg-1", promotionId: null })).toBe("bono");
  });

  it("classifies a sale with a promotion and no package as combo", () => {
    expect(classifySale({ clientPackageId: null, promotionId: "promo-1" })).toBe(
      "combo",
    );
  });

  it("classifies a sale with neither as a loose session", () => {
    expect(classifySale({ clientPackageId: null, promotionId: null })).toBe("suelta");
  });

  it("a bono sale wins over a promotion id (bonus promotions set both)", () => {
    expect(
      classifySale({ clientPackageId: "pkg-1", promotionId: "promo-1" }),
    ).toBe("bono");
  });
});

describe("buildSalesByType", () => {
  it("groups by type, VAT-splits each group, and appends a total row", () => {
    const rows = buildSalesByType(
      [
        { total: 121, vatRate: 0.21, clientPackageId: "pkg-1", promotionId: null },
        { total: 121, vatRate: 0.21, clientPackageId: null, promotionId: null },
      ],
      2,
    );
    const bono = rows.find((r) => r.type === "bono")!;
    const suelta = rows.find((r) => r.type === "suelta")!;
    const total = rows.find((r) => r.type === "total")!;

    expect(bono).toMatchObject({ gross: 121, net: 100, vat: 21, count: 1 });
    expect(suelta).toMatchObject({ gross: 121, net: 100, vat: 21, count: 1 });
    expect(total).toMatchObject({ gross: 242, net: 200, vat: 42, count: 2 });
  });

  it("omits types with no sales", () => {
    const rows = buildSalesByType(
      [{ total: 100, vatRate: 0, clientPackageId: null, promotionId: null }],
      2,
    );
    expect(rows.map((r) => r.type)).toEqual(["suelta", "total"]);
  });

  it("empty input yields only the zeroed total row", () => {
    const rows = buildSalesByType([], 2);
    expect(rows).toEqual([
      { type: "total", label: "Total", gross: 0, net: 0, vat: 0, count: 0 },
    ]);
  });
});

describe("buildVatBreakdown", () => {
  it("groups by rate label, sorted desc by rate, with a total row", () => {
    const rows = buildVatBreakdown(
      [
        { total: 121, vatRate: 0.21 },
        { total: 50, vatRate: 0 },
      ],
      2,
    );
    expect(rows.map((r) => r.rateLabel)).toEqual(["21%", "Exento", "Total"]);
    expect(rows[0]).toMatchObject({ gross: 121, net: 100, vat: 21 });
    expect(rows[1]).toMatchObject({ gross: 50, net: 50, vat: 0 });
    expect(rows[2]).toMatchObject({ gross: 171, net: 150, vat: 21 });
  });
});
