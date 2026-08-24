import type { AppSupabaseClient } from "@/lib/supabase/app-client";

export type ActiveClientPackageOption = {
  id: string;
  zoneId: string;
  zoneName: string;
  remaining: number;
};

/**
 * A client's `client_packages` rows with `remaining > 0` (total_sessions -
 * sessions_used), for the booking form's package picker — spec:
 * "package-sessions", mirrors the `client_package_remaining` view formula.
 */
export async function listClientActivePackages(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<ActiveClientPackageOption[]> {
  const { data, error } = await supabase
    .from("client_packages")
    .select("id, zone_id, total_sessions, sessions_used, body_zones(name)")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  return (data ?? [])
    .map((row) => ({
      id: row.id,
      zoneId: row.zone_id,
      zoneName: row.body_zones?.name ?? "Zona desconocida",
      remaining: row.total_sessions - row.sessions_used,
    }))
    .filter((pkg) => pkg.remaining > 0);
}

export type LooseSaleOption = {
  id: string;
  description: string;
  total: number;
};

/**
 * A client's unclaimed loose-session sales — `sales` rows with no
 * `client_package_id` (not a package sale) and no `appointment_id` yet (not
 * already linked to a booked appointment). Backs the booking form's "sesión
 * suelta" picker (task: "tied to a loose sales row from the
 * Paquetes/Sesiones batch"), reusing the `sales` rows PR4's
 * `sellLooseSession` already creates instead of rebuilding the sale side.
 */
export async function listClientLooseSales(
  supabase: AppSupabaseClient,
  clientId: string,
): Promise<LooseSaleOption[]> {
  const { data, error } = await supabase
    .from("sales")
    .select("id, description, total")
    .eq("client_id", clientId)
    .eq("status", "open")
    .is("client_package_id", null)
    .is("appointment_id", null)
    .order("sold_at", { ascending: false });
  if (error) throw error;

  return data ?? [];
}
