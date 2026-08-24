import { toZonedTime } from "date-fns-tz";

const CLINIC_TZ = "America/Argentina/Buenos_Aires";

export type MonthRange = { start: string; end: string };

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Current calendar-month bounds in the clinic's timezone, as `YYYY-MM-DD`
 * strings — `end` is exclusive (the first day of the following month).
 * `expenses.spent_on` is a plain SQL `date` (no time component), so this
 * mirrors the dashboard's `monthRangeUtc` tz-conversion approach but returns
 * date strings suitable for `.gte("spent_on", ...).lt("spent_on", ...)`
 * instead of timestamptz ISO strings.
 */
export function currentMonthRange(now: Date): MonthRange {
  const zoned = toZonedTime(now, CLINIC_TZ);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const start = `${y}-${pad(m + 1)}-01`;
  const end =
    m === 11 ? `${y + 1}-01-01` : `${y}-${pad(m + 2)}-01`;
  return { start, end };
}

/** Pure sum of `amount` across a list of expenses. */
export function sumExpenses(expenses: { amount: number }[]): number {
  return expenses.reduce((total, expense) => total + expense.amount, 0);
}

/**
 * Total of expenses whose `spentOn` (`YYYY-MM-DD`) date falls within the
 * current Buenos Aires calendar month. String comparison is safe because
 * `YYYY-MM-DD` sorts lexicographically the same as chronologically.
 */
export function currentMonthTotal(
  expenses: { amount: number; spentOn: string }[],
  now: Date,
): number {
  const { start, end } = currentMonthRange(now);
  return sumExpenses(
    expenses.filter((e) => e.spentOn >= start && e.spentOn < end),
  );
}
