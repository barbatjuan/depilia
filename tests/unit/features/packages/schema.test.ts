import { describe, expect, it } from "vitest";
import {
  sellPackageSchema,
  sellLooseSessionSchema,
} from "@/features/packages/schema";

describe("sellPackageSchema", () => {
  it("accepts a template-based sale (templateId set, no custom fields required)", () => {
    const result = sellPackageSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "22222222-2222-2222-2222-222222222222",
      zoneId: "",
      sessionCount: "",
      price: "",
    });

    expect(result.success).toBe(true);
  });

  it("accepts an ad-hoc sale (zone + session count + price, no templateId)", () => {
    const result = sellPackageSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "",
      zoneId: "33333333-3333-3333-3333-333333333333",
      sessionCount: "6",
      price: "60000",
    });

    expect(result.success).toBe(true);
  });

  it("rejects when neither a template nor a full ad-hoc zone/count/price is given", () => {
    const result = sellPackageSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "",
      zoneId: "",
      sessionCount: "",
      price: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().formErrors).toContain(
        "Elegí un paquete del catálogo o completá zona, sesiones y precio.",
      );
    }
  });

  it("rejects an ad-hoc sale with a zero session count", () => {
    const result = sellPackageSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "",
      zoneId: "33333333-3333-3333-3333-333333333333",
      sessionCount: "0",
      price: "60000",
    });

    expect(result.success).toBe(false);
  });
});

describe("sellLooseSessionSchema", () => {
  it("accepts a tariff-driven loose-session sale with an explicit amount", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "33333333-3333-3333-3333-333333333333",
      amount: "15000",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBe(15000);
  });

  it("accepts a blank amount (server falls back to the tariff session_price)", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "33333333-3333-3333-3333-333333333333",
      amount: "",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.amount).toBeNull();
  });

  it("rejects a missing tariff", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      templateId: "",
      amount: "15000",
    });

    expect(result.success).toBe(false);
  });
});

const CLIENT = "11111111-1111-1111-1111-111111111111";
const TEMPLATE = "22222222-2222-2222-2222-222222222222";

describe("sellPackageSchema — manual discount", () => {
  const withDiscount = (over: Record<string, unknown>) =>
    sellPackageSchema.safeParse({
      clientId: CLIENT,
      templateId: TEMPLATE,
      zoneId: "",
      sessionCount: "",
      price: "",
      discountKind: "",
      discountValue: "",
      discountReason: "",
      ...over,
    });

  it("accepts a sale with no discount fields", () => {
    expect(withDiscount({}).success).toBe(true);
  });

  it("requires a reason when a discount amount is entered", () => {
    const result = withDiscount({ discountKind: "percent", discountValue: "10" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.discountReason?.[0]).toBe(
        "Ingresá el motivo del descuento.",
      );
    }
  });

  it("rejects a percent discount above 100", () => {
    const result = withDiscount({
      discountKind: "percent",
      discountValue: "150",
      discountReason: "Error",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a fixed discount that is zero or negative", () => {
    const result = withDiscount({
      discountKind: "fixed",
      discountValue: "0",
      discountReason: "Nada",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid percent discount with a reason", () => {
    const result = withDiscount({
      discountKind: "percent",
      discountValue: "10",
      discountReason: "Cliente frecuente",
    });
    expect(result.success).toBe(true);
  });
});

describe("sellLooseSessionSchema — manual discount", () => {
  it("requires a reason when a discount is entered", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: CLIENT,
      templateId: "33333333-3333-3333-3333-333333333333",
      amount: "15000",
      discountKind: "fixed",
      discountValue: "2000",
      discountReason: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a loose sale with a valid discount", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: CLIENT,
      templateId: "33333333-3333-3333-3333-333333333333",
      amount: "15000",
      discountKind: "fixed",
      discountValue: "2000",
      discountReason: "Promo",
    });
    expect(result.success).toBe(true);
  });
});
