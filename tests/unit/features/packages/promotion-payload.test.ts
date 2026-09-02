import { describe, expect, it } from "vitest";
import {
  buildPackageSalePayload,
  type PackageTemplateOption,
} from "@/features/packages/domain/sell-package";

const tariff: PackageTemplateOption = {
  id: "tariff-1",
  zoneId: "zone-1",
  zoneName: "Axilas",
  name: "Axilas x6",
  gender: "mujer",
  sizeCategory: "pequena",
  defaultSessions: 6,
  sessionPrice: 10000,
  bonoPrice: 60000,
  vatRate: 0.1,
};

function promoReq(overridePrice: number | null) {
  return {
    source: "promotion" as const,
    promotionId: "promo-1",
    promotionName: "6+2 gratis",
    tariff,
    bonusSessions: 2,
    overridePrice,
  };
}

describe("buildPackageSalePayload — promotion source", () => {
  it("boosts total_sessions by the bonus and sets promotion_id", () => {
    const payload = buildPackageSalePayload(promoReq(null));

    expect(payload).toMatchObject({
      promotionId: "promo-1",
      zoneId: "zone-1",
      totalSessions: 8,
      price: 60000,
      listTotal: 60000,
      total: 60000,
      discountAmount: 0,
      vatRate: 0.1,
    });
    expect(payload.description).toContain("6+2 gratis");
    expect(payload.description).toContain("6+2 sesiones");
  });

  it("uses the promotion item override price as the list total", () => {
    const payload = buildPackageSalePayload(promoReq(50000));
    expect(payload).toMatchObject({ price: 50000, listTotal: 50000, total: 50000 });
  });

  it("still applies a discount code / manual discount on top of the promo price", () => {
    const payload = buildPackageSalePayload(promoReq(null), {
      kind: "percent",
      value: 10,
      reason: "Código VERANO",
      fractionDigits: 2,
      codeId: "code-1",
    });

    expect(payload).toMatchObject({
      promotionId: "promo-1",
      listTotal: 60000,
      discountAmount: 6000,
      total: 54000,
      discountCodeId: "code-1",
    });
  });
});
