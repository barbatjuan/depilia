import { describe, expect, it } from "vitest";
import {
  deriveSaleBalance,
  STATUS_LABEL,
} from "@/features/sales/domain/sale-balance";

describe("deriveSaleBalance", () => {
  it("marks a sale with no payments as unpaid", () => {
    const result = deriveSaleBalance(100000, []);

    expect(result).toEqual({
      total: 100000,
      paid: 0,
      balance: 100000,
      status: "unpaid",
    });
  });

  it("marks a sale with some but not all payments as partial", () => {
    const result = deriveSaleBalance(100000, [
      { amount: 40000 },
      { amount: 20000 },
    ]);

    expect(result).toEqual({
      total: 100000,
      paid: 60000,
      balance: 40000,
      status: "partial",
    });
  });

  it("marks a sale paid exactly in full as paid, with a zero balance", () => {
    const result = deriveSaleBalance(100000, [
      { amount: 60000 },
      { amount: 40000 },
    ]);

    expect(result).toEqual({
      total: 100000,
      paid: 100000,
      balance: 0,
      status: "paid",
    });
  });

  it("derives balance across many small installments (pagos en cuotas)", () => {
    const result = deriveSaleBalance(90000, [
      { amount: 30000 },
      { amount: 30000 },
      { amount: 15000 },
    ]);

    expect(result).toEqual({
      total: 90000,
      paid: 75000,
      balance: 15000,
      status: "partial",
    });
  });

  it("exposes Spanish status labels for the three states", () => {
    expect(STATUS_LABEL.unpaid).toBe("Sin pagar");
    expect(STATUS_LABEL.partial).toBe("Parcial");
    expect(STATUS_LABEL.paid).toBe("Pagado");
  });
});
