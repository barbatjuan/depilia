import { describe, expect, it } from "vitest";
import { registerPaymentSchema } from "@/features/sales/schema";

describe("registerPaymentSchema", () => {
  it("accepts a valid partial payment", () => {
    const result = registerPaymentSchema.safeParse({
      saleId: "6f2f3c8a-6c3e-4a2c-9b5b-9c1f2a3d4e5f",
      amount: "40000",
      method: "cash",
      note: "Seña",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    const result = registerPaymentSchema.safeParse({
      saleId: "6f2f3c8a-6c3e-4a2c-9b5b-9c1f2a3d4e5f",
      amount: "0",
      method: "cash",
    });

    expect(result.success).toBe(false);
  });

  it("rejects a payment method outside the allowed enum", () => {
    const result = registerPaymentSchema.safeParse({
      saleId: "6f2f3c8a-6c3e-4a2c-9b5b-9c1f2a3d4e5f",
      amount: "1000",
      method: "bitcoin",
    });

    expect(result.success).toBe(false);
  });

  it("treats note as optional", () => {
    const result = registerPaymentSchema.safeParse({
      saleId: "6f2f3c8a-6c3e-4a2c-9b5b-9c1f2a3d4e5f",
      amount: "1000",
      method: "transfer",
    });

    expect(result.success).toBe(true);
  });
});
