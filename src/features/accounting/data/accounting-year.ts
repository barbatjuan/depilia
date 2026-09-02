import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { monthRange, prevMonthKey, yearStartKey } from "@/features/accounting/domain/period";
import type {
  PnlExpense,
  PnlPayment,
} from "@/features/accounting/domain/profit-and-loss";

export type AccountingYear = { payments: PnlPayment[]; expenses: PnlExpense[] };

/**
 * Payments + expenses spanning December of the previous year through the
 * end of `monthKey` — enough for `buildProfitAndLoss` to compute the current
 * month, the previous month (even across a year boundary, e.g. `mes=enero`),
 * and year-to-date in one shot. `payments` excludes void sales via the
 * `sales!inner(status)` embed filter.
 */
export async function getAccountingYear(
  supabase: AppSupabaseClient,
  monthKey: string,
): Promise<AccountingYear> {
  const windowStartKey = prevMonthKey(yearStartKey(monthKey));
  const windowStart = monthRange(windowStartKey);
  const windowEnd = monthRange(monthKey);

  const [paymentsResult, expensesResult] = await Promise.all([
    supabase
      .from("payments")
      .select("amount, paid_at, sales!inner(status)")
      .eq("sales.status", "open")
      .gte("paid_at", windowStart.startUtc)
      .lt("paid_at", windowEnd.endUtc),
    supabase
      .from("expenses")
      .select("amount, spent_on")
      .gte("spent_on", windowStart.startDate)
      .lt("spent_on", windowEnd.endDate),
  ]);
  if (paymentsResult.error) throw paymentsResult.error;
  if (expensesResult.error) throw expensesResult.error;

  return {
    payments: (paymentsResult.data ?? []).map((row) => ({
      amount: row.amount,
      paidAt: row.paid_at,
    })),
    expenses: (expensesResult.data ?? []).map((row) => ({
      amount: row.amount,
      spentOn: row.spent_on,
    })),
  };
}
