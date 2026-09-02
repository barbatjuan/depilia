import { describe, expect, it } from "vitest";
import {
  buildLooseSessionPayload,
  buildPackageSalePayload,
} from "@/features/packages/domain/sell-package";

const template = {
  id: "tpl-1",
  zoneId: "zone-1",
  zoneName: "Axilas",
  name: "Axilas x6",
  gender: "mujer" as const,
  sizeCategory: "pequena" as const,
  defaultSessions: 6,
  sessionPrice: 10000,
  bonoPrice: 60000,
  vatRate: 0.1,
};

describe("buildPackageSalePayload — discount fields", () => {
  it("carries list_total = total, amount 0, reason/by null when no discount is applied", () => {
    const payload = buildPackageSalePayload({ source: "template", template });
    expect(payload).toMatchObject({
      price: 60000,
      listTotal: 60000,
      total: 60000,
      discountAmount: 0,
      discountReason: null,
      discountedBy: null,
      vatRate: 0.1,
    });
  });

  it("folds a percent discount into total / discountAmount and keeps list_total", () => {
    const payload = buildPackageSalePayload(
      { source: "template", template },
      { kind: "percent", value: 10, reason: "Cliente frecuente", by: "staff-1", fractionDigits: 2 },
    );
    expect(payload).toMatchObject({
      listTotal: 60000,
      total: 54000,
      discountAmount: 6000,
      discountReason: "Cliente frecuente",
      discountedBy: "staff-1",
    });
  });

  it("throws a Spanish error when the discount reason is blank", () => {
    expect(() =>
      buildPackageSalePayload(
        { source: "template", template },
        { kind: "fixed", value: 1000, reason: "   " },
      ),
    ).toThrow("Ingresá el motivo del descuento.");
  });

  it("throws when the discount would leave the sale at zero", () => {
    expect(() =>
      buildPackageSalePayload(
        { source: "template", template },
        { kind: "percent", value: 100, reason: "Regalo", fractionDigits: 2 },
      ),
    ).toThrow("El descuento no puede dejar la venta en cero o negativa.");
  });
});

describe("buildLooseSessionPayload — discount fields", () => {
  const base = {
    templateId: "tpl-1",
    templateName: "Axilas",
    zoneName: "Axilas",
    sessionPrice: 15000,
    vatRate: 0.1,
    amount: null,
  };

  it("defaults discount fields when none is applied", () => {
    const payload = buildLooseSessionPayload(base);
    expect(payload).toMatchObject({
      price: 15000,
      listTotal: 15000,
      total: 15000,
      discountAmount: 0,
      discountReason: null,
      discountedBy: null,
      vatRate: 0.1,
    });
  });

  it("applies a fixed discount on the overridden amount", () => {
    const payload = buildLooseSessionPayload(
      { ...base, amount: 20000 },
      { kind: "fixed", value: 5000, reason: "Promo", by: "staff-9", fractionDigits: 2 },
    );
    expect(payload).toMatchObject({
      listTotal: 20000,
      total: 15000,
      discountAmount: 5000,
      discountReason: "Promo",
      discountedBy: "staff-9",
    });
  });
});

describe("buildPackageSalePayload — vatRate", () => {
  it("uses the template's vatRate for a catalog sale", () => {
    const payload = buildPackageSalePayload({ source: "template", template });
    expect(payload.vatRate).toBe(0.1);
  });

  it("uses the request's vatRate for an ad-hoc (custom) sale", () => {
    const payload = buildPackageSalePayload({
      source: "custom",
      zoneId: "zone-2",
      zoneName: "Piernas",
      sessionCount: 4,
      price: 90000,
      vatRate: 0.05,
    });
    expect(payload.vatRate).toBe(0.05);
  });

  it("falls back to DEFAULT_VAT_RATE for an ad-hoc sale with no vatRate given", () => {
    const payload = buildPackageSalePayload({
      source: "custom",
      zoneId: "zone-2",
      zoneName: "Piernas",
      sessionCount: 4,
      price: 90000,
    });
    expect(payload.vatRate).toBe(0.21);
  });
});
