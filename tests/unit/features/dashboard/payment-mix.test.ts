import { describe, expect, it } from "vitest";
import { buildPaymentMix } from "@/features/dashboard/domain/payment-mix";

describe("buildPaymentMix", () => {
  it("totals amounts per method and computes whole-number percentages", () => {
    const mix = buildPaymentMix([
      { amount: 60, method: "cash" },
      { amount: 20, method: "card" },
      { amount: 20, method: "transfer" },
    ]);

    expect(mix).toEqual([
      { method: "cash", label: "Efectivo", total: 60, pct: 60 },
      { method: "card", label: "Tarjeta", total: 20, pct: 20 },
      { method: "transfer", label: "Transferencia", total: 20, pct: 20 },
    ]);
  });

  it("keeps a fixed method order and drops methods with no payments", () => {
    const mix = buildPaymentMix([
      { amount: 10, method: "transfer" },
      { amount: 30, method: "cash" },
    ]);

    expect(mix.map((m) => m.method)).toEqual(["cash", "transfer"]);
  });

  it("folds unknown / 'other' methods into a single 'Otro' bucket", () => {
    const mix = buildPaymentMix([
      { amount: 50, method: "cash" },
      { amount: 50, method: "other" },
    ]);

    expect(mix.find((m) => m.method === "other")).toEqual({
      method: "other",
      label: "Otro",
      total: 50,
      pct: 50,
    });
  });

  it("returns an empty array when there are no payments", () => {
    expect(buildPaymentMix([])).toEqual([]);
  });

  it("coerces string amounts to numbers", () => {
    const mix = buildPaymentMix([{ amount: "100.00", method: "cash" }]);
    expect(mix[0]?.total).toBe(100);
  });
});
