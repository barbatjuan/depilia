import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { RecoveryClientInput } from "@/features/clients/domain/recovery";

/**
 * Every active client's last completed appointment, one row per client, in
 * a single round trip via PostgREST embedding (no N+1). Clients with no
 * completed appointment yet come back with `lastVisit: null` — `recovery.ts`
 * filters those out, "recuperar" implies they visited before.
 */
export async function getClientsToRecover(
  supabase: AppSupabaseClient,
): Promise<RecoveryClientInput[]> {
  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, first_name, last_name, phone, appointments(scheduled_at, status)",
    )
    .is("archived_at", null);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const completedVisits = (row.appointments ?? []).filter(
      (a) => a.status === "completed",
    );
    const lastVisit = completedVisits.length
      ? completedVisits.reduce(
          (latest, a) => (a.scheduled_at > latest ? a.scheduled_at : latest),
          completedVisits[0]!.scheduled_at,
        )
      : null;
    return {
      clientId: row.id,
      name: `${row.first_name} ${row.last_name}`,
      phone: row.phone,
      lastVisit,
    };
  });
}
