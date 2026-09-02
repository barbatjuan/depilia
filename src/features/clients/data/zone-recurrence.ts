import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { ZoneRecurrenceInput } from "@/features/clients/domain/zone-recurrence";

/** One `client_packages` row with the client, its zone, and every session
 * booked against the package (embedded via `appointments.client_package_id`,
 * which is exactly the package's own cadence history — a loose session in
 * the same zone does not consume this bono). */
export type PackageWithHistory = {
  client_id: string;
  zone_id: string;
  total_sessions: number;
  sessions_used: number;
  created_at: string;
  clients: {
    first_name: string;
    last_name: string;
    phone: string | null;
    archived_at: string | null;
  } | null;
  body_zones: { name: string; recommended_weeks: number } | null;
  appointments: { scheduled_at: string; status: string }[];
};

const SELECT =
  "client_id, zone_id, total_sessions, sessions_used, created_at, clients!inner(first_name, last_name, phone, archived_at), body_zones!inner(name, recommended_weeks), appointments(scheduled_at, status)";

/**
 * Maps one embedded package row to the domain input, or `null` when the
 * package is exhausted or its client is archived. Pure — unit-tested; the
 * bucketing/overdue logic lives in `zone-recurrence` domain.
 */
export function toRecurrenceInput(
  row: PackageWithHistory,
  now: Date,
): ZoneRecurrenceInput | null {
  if (!row.clients || !row.body_zones) return null;
  if (row.clients.archived_at !== null) return null;

  const remainingSessions = row.total_sessions - row.sessions_used;
  if (remainingSessions <= 0) return null;

  const nowMs = now.getTime();
  let lastSessionAt: string | null = null;
  let hasUpcomingSession = false;
  for (const appt of row.appointments) {
    if (appt.status === "completed") {
      if (lastSessionAt === null || appt.scheduled_at > lastSessionAt) {
        lastSessionAt = appt.scheduled_at;
      }
    } else if (
      appt.status === "scheduled" &&
      new Date(appt.scheduled_at).getTime() > nowMs
    ) {
      hasUpcomingSession = true;
    }
  }

  return {
    clientId: row.client_id,
    clientName: `${row.clients.first_name} ${row.clients.last_name}`,
    phone: row.clients.phone,
    zoneId: row.zone_id,
    zoneName: row.body_zones.name,
    recommendedWeeks: row.body_zones.recommended_weeks,
    remainingSessions,
    lastSessionAt,
    packageCreatedAt: row.created_at,
    hasUpcomingSession,
  };
}

/**
 * Every active bono (sessions still on it, client not archived) reshaped for
 * the "Recontacto por zona" domain. One round trip; `buildRecurrenceList`
 * then drops the ones on cadence or already re-booked.
 */
export async function getZonesToRecontact(
  supabase: AppSupabaseClient,
  now: Date = new Date(),
): Promise<ZoneRecurrenceInput[]> {
  const { data, error } = await supabase
    .from("client_packages")
    .select(SELECT);
  if (error) throw error;

  return (data ?? [])
    .map((row) => toRecurrenceInput(row, now))
    .filter((input): input is ZoneRecurrenceInput => input !== null);
}
