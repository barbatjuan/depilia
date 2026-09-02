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
    .select(
      "id, zone_id, name, gender, size_category, default_sessions, session_price, bono_price, vat_rate, body_zones(name)",
    )
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    zoneId: row.zone_id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    name: row.name,
    gender: row.gender as PackageTemplateOption["gender"],
    sizeCategory: row.size_category as PackageTemplateOption["sizeCategory"],
    defaultSessions: row.default_sessions,
    sessionPrice: row.session_price,
    bonoPrice: row.bono_price,
    vatRate: row.vat_rate,
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

export type GenderedZoneOption = { id: string; name: string; gender: string };

/**
 * Every (zone, gender) pair the catalog has an ACTIVE tariff for — the
 * booking form filters this by the chosen gender so a zone with no tariff
 * for that gender never appears. Derived from `package_templates`, not the
 * raw `body_zones` table (which is genderless).
 */
export async function listGenderedZones(
  supabase: AppSupabaseClient,
): Promise<GenderedZoneOption[]> {
  const { data, error } = await supabase
    .from("package_templates")
    .select("zone_id, gender, body_zones(name)")
    .eq("active", true);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.zone_id,
    name: row.body_zones?.name ?? "Zona desconocida",
    gender: row.gender,
  }));
}
