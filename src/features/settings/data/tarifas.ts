import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { Gender, SizeCategory } from "@/features/packages/domain/sell-package";
import type {
  TariffInput,
  TariffUpdateInput,
} from "@/features/settings/schema";

export type TariffRow = {
  id: string;
  zoneId: string;
  zoneName: string;
  name: string;
  gender: Gender;
  sizeCategory: SizeCategory;
  defaultSessions: number;
  sessionPrice: number;
  bonoPrice: number;
  vatRate: number;
  active: boolean;
};

const SELECT =
  "id, zone_id, name, gender, size_category, default_sessions, session_price, bono_price, vat_rate, active, body_zones(name)";

type RawTariff = {
  id: string;
  zone_id: string;
  name: string;
  gender: string;
  size_category: string;
  default_sessions: number;
  session_price: number;
  bono_price: number;
  vat_rate: number;
  active: boolean;
  body_zones: { name: string } | null;
};

function toRow(row: RawTariff): TariffRow {
  return {
    id: row.id,
    zoneId: row.zone_id,
    zoneName: row.body_zones?.name ?? "Zona desconocida",
    name: row.name,
    gender: row.gender as Gender,
    sizeCategory: row.size_category as SizeCategory,
    defaultSessions: row.default_sessions,
    sessionPrice: row.session_price,
    bonoPrice: row.bono_price,
    vatRate: row.vat_rate,
    active: row.active,
  };
}

/**
 * Tariffs for the management screen (`/configuracion/tarifas`). Defaults to
 * active-only; `includeArchived` adds the `active=false` rows for the
 * "mostrar archivadas" view.
 */
export async function listTariffs(
  supabase: AppSupabaseClient,
  filters: {
    gender?: Gender;
    sizeCategory?: SizeCategory;
    includeArchived?: boolean;
  } = {},
): Promise<TariffRow[]> {
  let query = supabase
    .from("package_templates")
    .select(SELECT)
    .order("name", { ascending: true });

  if (filters.gender) query = query.eq("gender", filters.gender);
  if (filters.sizeCategory)
    query = query.eq("size_category", filters.sizeCategory);
  if (!filters.includeArchived) query = query.eq("active", true);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((row) => toRow(row as unknown as RawTariff));
}

export async function getTariff(
  supabase: AppSupabaseClient,
  id: string,
): Promise<TariffRow | null> {
  const { data, error } = await supabase
    .from("package_templates")
    .select(SELECT)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as unknown as RawTariff) : null;
}

/**
 * Resolves the target `body_zones.id` for a create: an existing zone matched
 * case-insensitively by name, or a freshly inserted one (the "type a new
 * zone" combobox path). No standalone zonas screen exists — bare zones are
 * only ever created here.
 */
async function resolveZoneId(
  supabase: AppSupabaseClient,
  zoneName: string,
): Promise<string> {
  const name = zoneName.trim();

  const { data: existing, error: findError } = await supabase
    .from("body_zones")
    .select("id")
    .ilike("name", name)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return existing.id;

  const { data: created, error: createError } = await supabase
    .from("body_zones")
    .insert({ name })
    .select("id")
    .single();
  if (createError) throw createError;
  return created.id;
}

export async function createTariff(
  supabase: AppSupabaseClient,
  input: TariffInput,
): Promise<TariffRow> {
  const zoneId = await resolveZoneId(supabase, input.zoneName);
  const name = input.zoneName.trim();

  const { data, error } = await supabase
    .from("package_templates")
    .insert({
      zone_id: zoneId,
      name,
      gender: input.gender,
      size_category: input.sizeCategory,
      default_sessions: input.defaultSessions,
      session_price: input.sessionPrice,
      bono_price: input.bonoPrice,
      vat_rate: input.vatRate,
      active: true,
    })
    .select(SELECT)
    .single();
  if (error) throw error;
  return toRow(data as unknown as RawTariff);
}

export async function updateTariff(
  supabase: AppSupabaseClient,
  id: string,
  input: TariffUpdateInput,
): Promise<TariffRow> {
  const { data, error } = await supabase
    .from("package_templates")
    .update({
      size_category: input.sizeCategory,
      session_price: input.sessionPrice,
      bono_price: input.bonoPrice,
      vat_rate: input.vatRate,
    })
    .eq("id", id)
    .select(SELECT)
    .single();
  if (error) throw error;
  return toRow(data as unknown as RawTariff);
}

/**
 * Archive — never hard-delete (design decision 8). `client_packages.template_id`
 * is `ON DELETE SET NULL`, so a delete would silently orphan sale history;
 * `active=false` drops the tariff from `listActivePackageTemplates` while
 * every existing `client_packages` / `sales` row is untouched.
 */
export async function archiveTariff(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("package_templates")
    .update({ active: false })
    .eq("id", id);
  if (error) throw error;
}

/**
 * Unarchive. Guarded by the partial unique index — throws `23505` when an
 * active tariff for the same `(zone_id, gender)` was created in the meantime.
 */
export async function restoreTariff(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("package_templates")
    .update({ active: true })
    .eq("id", id);
  if (error) throw error;
}
