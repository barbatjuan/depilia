import type { AppSupabaseClient } from "@/lib/supabase/app-client";

export type ClientFirstSale = { clientId: string; firstSaleAt: string };

/**
 * Earliest-ever open sale per client — feeds `buildBusinessMetrics`'s
 * new-vs-returning split. Scans every open sale (small-clinic scale; would
 * need a dedicated `min(sold_at)` aggregate query if this ever gets big).
 */
export async function getClientsFirstSale(
  supabase: AppSupabaseClient,
): Promise<ClientFirstSale[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("client_id, sold_at")
    .eq("status", "open")
    .order("sold_at", { ascending: true });
  if (error) throw error;

  const firstByClient = new Map<string, string>();
  for (const row of data ?? []) {
    if (!firstByClient.has(row.client_id)) {
      firstByClient.set(row.client_id, row.sold_at);
    }
  }

  return [...firstByClient.entries()].map(([clientId, firstSaleAt]) => ({
    clientId,
    firstSaleAt,
  }));
}
