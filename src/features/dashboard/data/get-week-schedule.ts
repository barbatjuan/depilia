import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  bucketAppointmentsByWeekday,
  getClinicWeekBounds,
} from "@/features/dashboard/domain/schedule";

export type WeekSchedule = {
  weekStart: string;
  countsByWeekday: number[]; // index 0 = Monday … 6 = Sunday
};

/**
 * Appointment counts per weekday for the current Buenos Aires calendar week
 * — backs the "Esta semana" dashboard widget.
 */
export async function getWeekSchedule(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<WeekSchedule> {
  const { start, end } = getClinicWeekBounds(now);

  const { data, error } = await supabase
    .from("appointments")
    .select("scheduled_at")
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .neq("status", "cancelled");
  if (error) throw error;

  const countsByWeekday = bucketAppointmentsByWeekday(
    (data ?? []).map((row) => ({ scheduledAt: row.scheduled_at })),
    start,
  );

  return { weekStart: start.toISOString(), countsByWeekday };
}
