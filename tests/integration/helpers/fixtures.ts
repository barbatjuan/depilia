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
    "cash_movements",
    "cash_sessions",
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

/**
 * Creates a real Supabase Auth user plus a matching `staff` row (so
 * `public.is_staff()` / `public.current_staff_id()` resolve for that JWT).
 * Returns the staff id, the auth user id, and a `cleanup` that deletes the
 * auth user (the `staff` row cascades away with it).
 */
export async function seedStaffMember(
  db: SupabaseClient<Database>,
  overrides: Partial<{ full_name: string }> = {},
) {
  const email = `staff-${crypto.randomUUID()}@example.com`;
  const { data: created, error: userError } = await db.auth.admin.createUser({
    email,
    password: "correct horse battery staple 1!",
    email_confirm: true,
  });
  if (userError) throw userError;
  const userId = created.user!.id;

  const { data: staff, error: staffError } = await db
    .from("staff")
    .insert({ user_id: userId, full_name: overrides.full_name ?? "Caja Tester" })
    .select()
    .single();
  if (staffError) throw staffError;

  return {
    id: staff.id as string,
    userId,
    email,
    cleanup: async () => {
      await db.auth.admin.deleteUser(userId);
    },
  };
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

export async function seedPackageTemplate(
  db: SupabaseClient<Database>,
  params: {
    zone_id: string;
    name: string;
    default_sessions: number;
    price: number;
  },
) {
  const { data, error } = await db
    .from("package_templates")
    .insert({
      zone_id: params.zone_id,
      name: params.name,
      default_sessions: params.default_sessions,
      price: params.price,
    })
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

export async function seedLooseSale(
  db: SupabaseClient<Database>,
  params: { client_id: string; description?: string; total?: number },
) {
  const { data, error } = await db
    .from("sales")
    .insert({
      client_id: params.client_id,
      description: params.description ?? "Sesión suelta — Test",
      total: params.total ?? 15000,
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
