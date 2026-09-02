import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  buildAppointmentsSeries,
  type AppointmentsPoint,
} from "@/features/dashboard/domain/appointments-series";

const DAYS = 14;

/**
 * Daily appointment counts for the last 14 clinic-local days (cancelled
 * excluded) — backs the "Turnos por día" bar chart.
 */
export async function getAppointmentsSeries(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<AppointmentsPoint[]> {
  const since = new Date(
    now.getTime() - (DAYS + 2) * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .gte("scheduled_at", since)
    .neq("status", "cancelled");
  if (error) throw error;

  return buildAppointmentsSeries({
    appointments: (data ?? []).map((row) => ({
      scheduledAt: row.scheduled_at,
    })),
    days: DAYS,
    now,
  });
}
