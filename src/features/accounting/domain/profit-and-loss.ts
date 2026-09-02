import {
  monthKey as toMonthKey,
  nextMonthKey,
  prevMonthKey,
  yearStartKey,
} from "./period";

export type PnlPayment = { amount: number; paidAt: string };
export type PnlExpense = { amount: number; spentOn: string };

export type PnlSlice = { income: number; expense: number; result: number };

export type PnlDelta = PnlSlice & {
  incomePct: number | null;
  resultPct: number | null;
};

export type ProfitAndLoss = {
  month: PnlSlice;
  prev: PnlSlice;
  monthDelta: PnlDelta;
  ytd: PnlSlice;
};

function sliceForMonth(
  payments: PnlPayment[],
  expenses: PnlExpense[],
  key: string,
): PnlSlice {
  const income = payments
    .filter((p) => toMonthKey(new Date(p.paidAt)) === key)
    .reduce((sum, p) => sum + p.amount, 0);
  const expense = expenses
    .filter((e) => e.spentOn.slice(0, 7) === key)
    .reduce((sum, e) => sum + e.amount, 0);
  return { income, expense, result: income - expense };
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

function monthKeysBetween(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  let key = startKey;
  while (key !== endKey) {
    keys.push(key);
    key = nextMonthKey(key);
  }
  keys.push(endKey);
  return keys;
}

/**
 * Monthly P&L (spec: PASO 5.2 — accounting monthly report). `payments` /
 * `expenses` should cover at least Dec of the previous year through
 * `monthKey` (see `data/accounting-year.getAccountingYear`) so `prev` and
 * `ytd` never need a second query. Income is "cobrado" (payments.paid_at),
 * expense is `expenses.spent_on` — same basis as the rest of the app
 * (decision: "Base de reportes" in the plan).
 */
export function buildProfitAndLoss({
  monthKey,
  payments,
  expenses,
}: {
  monthKey: string;
  payments: PnlPayment[];
  expenses: PnlExpense[];
}): ProfitAndLoss {
  const month = sliceForMonth(payments, expenses, monthKey);
  const prev = sliceForMonth(payments, expenses, prevMonthKey(monthKey));

  const ytdKeys = monthKeysBetween(yearStartKey(monthKey), monthKey);
  const ytd = ytdKeys.reduce<PnlSlice>(
    (acc, key) => {
      const slice = sliceForMonth(payments, expenses, key);
      return {
        income: acc.income + slice.income,
        expense: acc.expense + slice.expense,
        result: acc.result + slice.result,
      };
    },
    { income: 0, expense: 0, result: 0 },
  );

  return {
    month,
    prev,
    monthDelta: {
      income: month.income - prev.income,
      expense: month.expense - prev.expense,
      result: month.result - prev.result,
      incomePct: pct(month.income, prev.income),
      resultPct: pct(month.result, prev.result),
    },
    ytd,
  };
}
