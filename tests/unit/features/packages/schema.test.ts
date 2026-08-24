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
  it("accepts a valid loose-session sale", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      zoneId: "33333333-3333-3333-3333-333333333333",
      price: "15000",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing zone", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      zoneId: "",
      price: "15000",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a non-positive price", () => {
    const result = sellLooseSessionSchema.safeParse({
      clientId: "11111111-1111-1111-1111-111111111111",
      zoneId: "33333333-3333-3333-3333-333333333333",
      price: "0",
    });

    expect(result.success).toBe(false);
  });
});
