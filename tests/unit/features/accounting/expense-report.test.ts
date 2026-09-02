import { describe, expect, it } from "vitest";
import { buildExpenseBreakdown } from "@/features/accounting/domain/expense-report";

describe("buildExpenseBreakdown", () => {
  it("groups by category desc by total, with pct of expenses and of income", () => {
    const rows = buildExpenseBreakdown(
      [
        { categoryName: "Insumos", amount: 300 },
        { categoryName: "Alquiler", amount: 700 },
        { categoryName: "Insumos", amount: 100 },
      ],
      2000,
    );
    expect(rows[0]).toMatchObject({ categoryName: "Alquiler", total: 700, pctOfExpenses: 63.6 });
    expect(rows[1]).toMatchObject({ categoryName: "Insumos", total: 400, pctOfExpenses: 36.4 });
    expect(rows[2]).toMatchObject({ categoryName: "Total", total: 1100 });
  });

  it("pctOfIncome is null when the month had no income", () => {
    const rows = buildExpenseBreakdown([{ categoryName: "Insumos", amount: 100 }], 0);
    expect(rows[0]!.pctOfIncome).toBeNull();
  });

  it("empty input yields only a zeroed total row", () => {
    expect(buildExpenseBreakdown([], 1000)).toEqual([
      { categoryName: "Total", total: 0, pctOfExpenses: 0, pctOfIncome: 0 },
    ]);
  });
});
