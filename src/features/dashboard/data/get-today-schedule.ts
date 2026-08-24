import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { getClinicDayBounds } from "@/features/dashboard/domain/schedule";

export type TodayAppointment = {
  id: string;
  clientName: string;
  scheduledAt: string;
  zoneName: string;
  status: string;
};

/**
 * Today's appointments (Buenos Aires calendar day), joined to client name
 * and zone, ordered by time — backs the "Turnos de hoy" dashboard widget.
 * Empty array is a correct empty state when nothing is scheduled.
 */
export async function getTodaySchedule(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<TodayAppointment[]> {
  const { start, end } = getClinicDayBounds(now);

  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, status, clients(first_name, last_name), body_zones(name)",
    )
    .gte("scheduled_at", start.toISOString())
    .lt("scheduled_at", end.toISOString())
    .order("scheduled_at", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    clientName: row.clients
      ? `${row.clients.first_name} ${row.clients.last_name}`
      : "Cliente desconocido",
    scheduledAt: row.scheduled_at,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    status: row.status,
  }));
}
