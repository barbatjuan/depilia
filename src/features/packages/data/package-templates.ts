import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { PackageTemplateOption } from "@/features/packages/domain/sell-package";

/**
 * Active catalog `package_templates` for the "sell a package" picker
 * (design: "a simple template picker is enough, no separate
 * catalog-management screen needed for v1").
 */
export async function listActivePackageTemplates(
  supabase: AppSupabaseClient,
): Promise<PackageTemplateOption[]> {
  const { data, error } = await supabase
    .from("package_templates")
    .select("id, zone_id, name, default_sessions, price, body_zones(name)")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    zoneId: row.zone_id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    name: row.name,
    defaultSessions: row.default_sessions,
    price: row.price,
  }));
}

export type BodyZoneOption = { id: string; name: string };

/** Active body zones, for the ad-hoc package / loose-session zone picker. */
export async function listActiveBodyZones(
  supabase: AppSupabaseClient,
): Promise<BodyZoneOption[]> {
  const { data, error } = await supabase
    .from("body_zones")
    .select("id, name")
    .eq("archived", false)
    .order("name", { ascending: true });
  if (error) throw error;

  return data ?? [];
}
