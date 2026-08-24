import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { ClientPackageRow } from "@/features/clients/domain/client-packages";

/**
 * Client packages joined to their zone name, in the shape the pure
 * `summarizeClientPackages` domain function expects (spec: "client-management
 * / Ficha shows session balances").
 */
export async function getClientPackages(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<ClientPackageRow[]> {
  const { data, error } = await supabase
    .from("client_packages")
    .select("id, zone_id, total_sessions, sessions_used, created_at, body_zones(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    zoneId: row.zone_id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    totalSessions: row.total_sessions,
    sessionsUsed: row.sessions_used,
    createdAt: row.created_at,
  }));
}

export type ClientAppointmentRow = {
  id: string;
  zoneName: string;
  scheduledAt: string;
  status: string;
  notes: string | null;
};

/**
 * Treatment history: past/all appointments for a client, most recent first.
 */
export async function getClientAppointments(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<ClientAppointmentRow[]> {
  const { data, error } = await supabase
    .from("appointments")
    .select("id, scheduled_at, status, notes, body_zones(name)")
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    scheduledAt: row.scheduled_at,
    status: row.status,
    notes: row.notes,
  }));
}
