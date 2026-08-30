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
