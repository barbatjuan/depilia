import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  buildRevenueSeries,
  type RevenuePoint,
} from "@/features/dashboard/domain/revenue-series";

const DAYS = 30;

/**
 * Daily payment totals for the last 30 clinic-local days — backs the
 * "Ingresos" area chart. Fetches a slightly wider window than needed and
 * lets the pure aggregator bucket/trim exactly.
 */
export async function getRevenueSeries(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<RevenuePoint[]> {
  const since = new Date(
    now.getTime() - (DAYS + 2) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .gte("paid_at", since);
  if (error) throw error;

  return buildRevenueSeries({
    payments: (data ?? []).map((row) => ({
      amount: row.amount,
      paidAt: row.paid_at,
    })),
    days: DAYS,
    now,
  });
}
