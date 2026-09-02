import { describe, expect, it } from "vitest";
import { buildProfitAndLoss } from "@/features/accounting/domain/profit-and-loss";

describe("buildProfitAndLoss", () => {
  it("slices income/expense for the given month only", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-06",
      payments: [
        { amount: 1000, paidAt: "2026-06-05T13:00:00Z" },
        { amount: 500, paidAt: "2026-06-20T13:00:00Z" },
        { amount: 9999, paidAt: "2026-07-01T13:00:00Z" },
      ],
      expenses: [
        { amount: 300, spentOn: "2026-06-10" },
        { amount: 9999, spentOn: "2026-07-02" },
      ],
    });
    expect(result.month).toEqual({ income: 1500, expense: 300, result: 1200 });
  });

  it("crosses the year boundary — January's prev is December of the previous year", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-01",
      payments: [
        { amount: 800, paidAt: "2026-01-10T13:00:00Z" },
        { amount: 400, paidAt: "2025-12-15T13:00:00Z" },
      ],
      expenses: [],
    });
    expect(result.month.income).toBe(800);
    expect(result.prev.income).toBe(400);
  });

  it("YTD for January equals just January", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-01",
      payments: [{ amount: 800, paidAt: "2026-01-10T13:00:00Z" }],
      expenses: [{ amount: 100, spentOn: "2026-01-05" }],
    });
    expect(result.ytd).toEqual({ income: 800, expense: 100, result: 700 });
  });

  it("accumulates YTD across multiple months", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-03",
      payments: [
        { amount: 100, paidAt: "2026-01-10T13:00:00Z" },
        { amount: 200, paidAt: "2026-02-10T13:00:00Z" },
        { amount: 300, paidAt: "2026-03-10T13:00:00Z" },
      ],
      expenses: [],
    });
    expect(result.ytd.income).toBe(600);
  });

  it("incomePct/resultPct are null when the previous month was zero", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-06",
      payments: [{ amount: 500, paidAt: "2026-06-05T13:00:00Z" }],
      expenses: [],
    });
    expect(result.monthDelta.incomePct).toBeNull();
    expect(result.monthDelta.resultPct).toBeNull();
  });

  it("computes a real pct delta when the previous month has income", () => {
    const result = buildProfitAndLoss({
      monthKey: "2026-06",
      payments: [
        { amount: 1500, paidAt: "2026-06-05T13:00:00Z" },
        { amount: 1000, paidAt: "2026-05-05T13:00:00Z" },
      ],
      expenses: [],
    });
    expect(result.monthDelta.incomePct).toBe(50);
  });

  it("empty input yields all zeros, not NaN or undefined", () => {
    const result = buildProfitAndLoss({ monthKey: "2026-06", payments: [], expenses: [] });
    expect(result.month).toEqual({ income: 0, expense: 0, result: 0 });
    expect(result.prev).toEqual({ income: 0, expense: 0, result: 0 });
    expect(result.ytd.income).toBe(0);
  });
});
