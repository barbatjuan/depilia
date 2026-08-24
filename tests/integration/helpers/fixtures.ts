import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

/**
 * Truncates every application table (in FK-safe order) so each integration
 * spec starts from a clean slate. Tables are additive-only in migrations,
 * so this list must be extended as new tables are added.
 */
export async function resetDatabase(db: SupabaseClient<Database>) {
  const tables = [
    "reminder_log",
    "payments",
    "sales",
    "appointments",
    "client_packages",
    "expenses",
    "expense_categories",
    "package_templates",
    "body_zones",
    "clients",
    "clinic_settings",
    "staff",
  ];
  for (const table of tables) {
    const { error } = await db.rpc("truncate_table", { table_name: table });
    if (error) throw error;
  }
}

export async function seedStaff(
  db: SupabaseClient<Database>,
  overrides: Partial<{ user_id: string; full_name: string }> = {},
) {
  const { data, error } = await db
    .from("staff")
    .insert({
      user_id: overrides.user_id ?? crypto.randomUUID(),
      full_name: overrides.full_name ?? "Admin Test",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function seedZone(db: SupabaseClient<Database>, name: string) {
  const { data, error } = await db
    .from("body_zones")
    .insert({ name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function seedClient(db: SupabaseClient<Database>, name = "Test Client") {
  const { data, error } = await db
    .from("clients")
    .insert({ first_name: name, last_name: "Apellido" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function seedClientPackage(
  db: SupabaseClient<Database>,
  params: {
    client_id: string;
    zone_id: string;
    total_sessions: number;
    sessions_used?: number;
  },
) {
  const { data, error } = await db
    .from("client_packages")
    .insert({
      client_id: params.client_id,
      zone_id: params.zone_id,
      total_sessions: params.total_sessions,
      sessions_used: params.sessions_used ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function seedAppointment(
  db: SupabaseClient<Database>,
  params: {
    client_id: string;
    zone_id: string;
    client_package_id?: string | null;
    scheduled_at: string;
    duration_minutes?: number;
    status?: string;
  },
) {
  const { data, error } = await db
    .from("appointments")
    .insert({
      client_id: params.client_id,
      zone_id: params.zone_id,
      client_package_id: params.client_package_id ?? null,
      scheduled_at: params.scheduled_at,
      duration_minutes: params.duration_minutes ?? 30,
      status: params.status ?? "scheduled",
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}
