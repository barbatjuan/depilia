import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  buildDashboardKpis,
  type DashboardKpis,
} from "@/features/dashboard/domain/kpis";
import { getClinicDayBounds } from "@/features/dashboard/domain/schedule";
import { monthKey, monthRange } from "@/features/accounting/domain/period";

const LOW_SESSION_THRESHOLD = 1;

/**
 * Fetches the raw counts/rows the dashboard needs and hands them to the
 * pure `buildDashboardKpis` aggregator. Every table is empty on a fresh
 * seed, so zeros here are a correct empty state, not a placeholder.
 */
export async function getDashboardKpis(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<DashboardKpis> {
  const dayBounds = getClinicDayBounds(now);
  const today = {
    start: dayBounds.start.toISOString(),
    end: dayBounds.end.toISOString(),
  };
  const month = monthRange(monthKey(now));
  const upcoming7DaysEnd = new Date(
    now.getTime() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    todayAppointments,
    monthPayments,
    activeClients,
    upcoming7Days,
    lowSessionPackages,
  ] = await Promise.all([
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", today.start)
      .lt("scheduled_at", today.end)
      .neq("status", "cancelled"),
    supabase
      .from("payments")
      .select("amount")
      .gte("paid_at", month.startUtc)
      .lt("paid_at", month.endUtc),
    supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .is("archived_at", null),
    supabase
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .gte("scheduled_at", now.toISOString())
      .lt("scheduled_at", upcoming7DaysEnd)
      .eq("status", "scheduled"),
    supabase
      .from("client_package_remaining")
      .select("id", { count: "exact", head: true })
      .lte("remaining", LOW_SESSION_THRESHOLD)
      .gt("remaining", 0),
  ]);

  return buildDashboardKpis({
    todayAppointmentsCount: todayAppointments.count ?? 0,
    monthPayments: monthPayments.data ?? [],
    activeClientsCount: activeClients.count ?? 0,
    upcoming7DaysCount: upcoming7Days.count ?? 0,
    lowSessionPackagesCount: lowSessionPackages.count ?? 0,
  });
}
