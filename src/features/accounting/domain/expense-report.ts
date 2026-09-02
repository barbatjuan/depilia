export type ExpenseBreakdownRow = {
  categoryName: string;
  total: number;
  pctOfExpenses: number;
  pctOfIncome: number | null;
};

/**
 * Expenses grouped by category, desc by total, with each row's share of the
 * month's total expenses and (when there was income) of the month's income —
 * plus a trailing "Total" row.
 */
export function buildExpenseBreakdown(
  expenses: { categoryName: string; amount: number }[],
  monthIncome: number,
): ExpenseBreakdownRow[] {
  const totals = new Map<string, number>();
  for (const expense of expenses) {
    totals.set(
      expense.categoryName,
      (totals.get(expense.categoryName) ?? 0) + expense.amount,
    );
  }

  const grandTotal = [...totals.values()].reduce((sum, n) => sum + n, 0);

  const rows: ExpenseBreakdownRow[] = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryName, total]) => ({
      categoryName,
      total,
      pctOfExpenses:
        grandTotal === 0 ? 0 : Math.round((total / grandTotal) * 1000) / 10,
      pctOfIncome:
        monthIncome === 0 ? null : Math.round((total / monthIncome) * 1000) / 10,
    }));

  rows.push({
    categoryName: "Total",
    total: grandTotal,
    pctOfExpenses: grandTotal === 0 ? 0 : 100,
    pctOfIncome:
      monthIncome === 0 ? null : Math.round((grandTotal / monthIncome) * 1000) / 10,
  });

  return rows;
}
