import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { DateRange } from "@/features/reminders/domain/reminder-window";

export type CandidateAppointment = {
  id: string;
  scheduledAt: string;
  status: string;
  zoneName: string;
  clientName: string;
  clientEmail: string | null;
};

/**
 * Scheduled appointments inside `window` (the DB-level narrowing; the
 * authoritative eligibility check is `selectAppointmentsNeedingReminder`,
 * run on this already-fetched list), joined to client name/email and zone
 * name so the reminder job never needs a second round trip per
 * appointment.
 */
export async function getCandidateAppointments(
  supabase: AppSupabaseClient,
  window: DateRange,
): Promise<CandidateAppointment[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, scheduled_at, status, clients(first_name, last_name, email), body_zones(name)",
    )
    .eq("status", "scheduled")
    .gte("scheduled_at", window.start.toISOString())
    .lt("scheduled_at", window.end.toISOString());
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    scheduledAt: row.scheduled_at,
    status: row.status,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    clientName: row.clients
      ? `${row.clients.first_name} ${row.clients.last_name}`
      : "Cliente desconocido",
    clientEmail: row.clients?.email ?? null,
  }));
}
