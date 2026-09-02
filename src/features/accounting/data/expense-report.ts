import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { monthRange } from "@/features/accounting/domain/period";
import { listExpenses, type ExpenseRow } from "@/features/expenses/data/expenses";

/** The month's expenses, in the shape `buildExpenseBreakdown` expects. */
export async function getExpenseReport(
  supabase: AppSupabaseClient,
  monthKey: string,
): Promise<ExpenseRow[]> {
  const range = monthRange(monthKey);
  return listExpenses(supabase, { from: range.startDate, to: range.endDate });
}
