import { describe, expect, it } from "vitest";
import { expenseCategorySchema, expenseSchema } from "@/features/expenses/schema";

describe("expenseSchema", () => {
  const valid = {
    categoryId: "6f2f3c8a-6c3e-4a2c-9b5b-9c1f2a3d4e5f",
    amount: "5000",
    description: "Guantes descartables",
    spentOn: "2026-08-20",
  };

  it("accepts a valid expense", () => {
    const result = expenseSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("rejects a zero or negative amount", () => {
    const result = expenseSchema.safeParse({ ...valid, amount: "0" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing category", () => {
    const result = expenseSchema.safeParse({ ...valid, categoryId: "" });
    expect(result.success).toBe(false);
  });

  it("rejects a missing date", () => {
    const result = expenseSchema.safeParse({ ...valid, spentOn: "" });
    expect(result.success).toBe(false);
  });

  it("treats description as optional", () => {
    const result = expenseSchema.safeParse({ ...valid, description: undefined });
    expect(result.success).toBe(true);
  });

  it("defaults method to 'cash' when omitted", () => {
    const result = expenseSchema.safeParse({ ...valid, method: undefined });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.method).toBe("cash");
  });

  it("accepts the four known methods and rejects an unknown one", () => {
    for (const method of ["cash", "card", "transfer", "other"]) {
      expect(expenseSchema.safeParse({ ...valid, method }).success).toBe(true);
    }
    expect(expenseSchema.safeParse({ ...valid, method: "bitcoin" }).success).toBe(
      false,
    );
  });
});

describe("expenseCategorySchema", () => {
  it("accepts a valid category name", () => {
    const result = expenseCategorySchema.safeParse({ name: "Insumos" });
    expect(result.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const result = expenseCategorySchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });
});
