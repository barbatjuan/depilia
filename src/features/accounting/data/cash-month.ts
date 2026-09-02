import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { monthRange } from "@/features/accounting/domain/period";
import {
  buildCashMonthSummary,
  type CashMonthSummary,
} from "@/features/accounting/domain/cash-month";
import { listSessionsInRange } from "@/features/cash/data/cash-session";
import { listMovementsInRange } from "@/features/cash/data/cash-movements";

export async function getCashMonthReport(
  supabase: AppSupabaseClient,
  monthKey: string,
): Promise<CashMonthSummary> {
  const range = monthRange(monthKey);
  const [sessions, movements] = await Promise.all([
    listSessionsInRange(supabase, range.startDate, range.endDate),
    listMovementsInRange(supabase, range.startDate, range.endDate),
  ]);

  return buildCashMonthSummary({
    sessions: sessions.map((s) => ({ status: s.status, difference: s.difference })),
    movements: movements.map((m) => ({ direction: m.direction, amount: m.amount })),
  });
}
