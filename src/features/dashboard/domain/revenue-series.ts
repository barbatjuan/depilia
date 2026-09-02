import { dayKey, windowDates } from "@/features/dashboard/domain/day-window";

export type RevenuePoint = { date: string; total: number };

type PaymentInput = { amount: number | string; paidAt: string };

/**
 * Daily payment totals over the last `days` clinic-local days, zero-filled and
 * oldest-first. Pure — `get-revenue-series` fetches the rows and hands them here.
 */
export function buildRevenueSeries({
  payments,
  days,
  now,
}: {
  payments: PaymentInput[];
  days: number;
  now: Date;
}): RevenuePoint[] {
  const dates = windowDates(days, now);
  const totals = new Map(dates.map((date) => [date, 0]));

  for (const payment of payments) {
    const key = dayKey(new Date(payment.paidAt));
    const current = totals.get(key);
    if (current !== undefined) {
      totals.set(key, current + Number(payment.amount));
    }
  }

  return dates.map((date) => ({ date, total: totals.get(date) ?? 0 }));
}
