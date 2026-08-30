import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { formatInTimeZone } from "date-fns-tz";
import type { Database } from "../src/lib/supabase/types";

// The Playwright test process is a separate Node process from `pnpm dev` —
// it needs its own env loaded to reach the local Supabase stack the same
// way `tests/setup-integration.ts` does for Vitest integration tests.
config({ path: ".env.local" });

// `supabase start` always prints these fixed local values; no secrets here
// (same fallback constants as `tests/integration/helpers/supabase.ts`).
const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

// Same admin credentials `e2e/login.spec.ts` already logs in with (see
// README "First-run local setup").
export const E2E_ADMIN_EMAIL =
  process.env.E2E_ADMIN_EMAIL ?? "admin@depilia.local";
export const E2E_ADMIN_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

// This MVP has no catalog-management UI for package templates (Phase 8 apply
// note: "zonas/paquetes sub-pages out of scope for this batch"), so the
// golden-path E2E test needs one seeded directly against the DB — exactly
// like a real deployment would seed its initial catalog once, out of band.
export const E2E_PACKAGE_TEMPLATE_NAME = "E2E Golden Path Package";
export const E2E_PACKAGE_TEMPLATE_ZONE = "legs";
export const E2E_PACKAGE_TEMPLATE_SESSIONS = 3;
export const E2E_PACKAGE_TEMPLATE_PRICE = 30000;
export const E2E_EXPENSE_CATEGORY_NAME = "Marketing";

export function serviceRoleClient(): SupabaseClient<Database> {
  return createClient<Database>(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const CLINIC_TZ = "America/Argentina/Buenos_Aires";

/**
 * Ensures there is an OPEN `cash_sessions` row for today's Buenos Aires
 * business date. The closed-caja advisory (Slice C) redirects a cash expense
 * to `/gastos?aviso=caja-cerrada` when no caja is open — the golden path
 * creates exactly such an expense and asserts a plain `/gastos` URL, so this
 * fixture keeps that path green regardless of what other specs did. Idempotent
 * and self-healing, like the rest of this setup.
 */
export async function ensureOpenCajaToday(service: SupabaseClient<Database>) {
  const businessDate = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");

  const { data: existing } = await service
    .from("cash_sessions")
    .select("id, status")
    .eq("business_date", businessDate)
    .maybeSingle();
  if (existing?.status === "open") return;
  if (existing) {
    await service.from("cash_movements").delete().eq("session_id", existing.id);
    await service.from("cash_sessions").delete().eq("id", existing.id);
  }

  const { data: staff } = await service
    .from("staff")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!staff) throw new Error("ensureOpenCajaToday: no staff row to own the session");

  const { error } = await service.from("cash_sessions").insert({
    business_date: businessDate,
    status: "open",
    opening_amount: 0,
    opened_by: staff.id,
  });
  if (error) throw error;
}

/**
 * Playwright global setup for `e2e/golden-path.spec.ts`. Seeds the fixture
 * data no UI screen in this MVP can create:
 *   1. The local admin auth user + matching `staff` row the golden path
 *      logs in as.
 *   2. A `body_zones` row and an active `package_templates` row so "Vender
 *      paquete" has a real catalog item to sell.
 *   3. An `expense_categories` row for the "create an expense" step.
 * Fully idempotent/self-healing — safe to run against a stack that already
 * has this fixture data, AND against one where `pnpm test` (Vitest
 * integration) just ran and truncated every table via its shared
 * `resetDatabase` fixture helper (catalog tables included) — this does not
 * assume the `0010_seed_dev.sql` migration seed rows are still there, it
 * recreates whatever is missing. A `supabase db reset` between runs is
 * optional, not required (see `pnpm e2e:reset`).
 */
export default async function globalSetup() {
  const service = serviceRoleClient();

  await ensureAdminStaffUser(service);
  const zoneId = await ensureBodyZone(service, E2E_PACKAGE_TEMPLATE_ZONE);
  await ensurePackageTemplate(service, zoneId);
  await ensureExpenseCategory(service, E2E_EXPENSE_CATEGORY_NAME);
  await ensureOpenCajaToday(service);
}

async function ensureAdminStaffUser(service: SupabaseClient<Database>) {
  const { data: existingUsers, error: listError } =
    await service.auth.admin.listUsers();
  if (listError) throw listError;

  let userId = existingUsers.users.find(
    (user) => user.email === E2E_ADMIN_EMAIL,
  )?.id;

  if (!userId) {
    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email: E2E_ADMIN_EMAIL,
        password: E2E_ADMIN_PASSWORD,
        email_confirm: true,
      });
    if (createError) throw createError;
    userId = created.user!.id;
  }

  const { data: existingStaff, error: staffError } = await service
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  if (staffError) throw staffError;

  if (!existingStaff) {
    const { error: insertError } = await service
      .from("staff")
      .insert({ user_id: userId, full_name: "E2E Admin" });
    if (insertError) throw insertError;
  }
}

async function ensureBodyZone(
  service: SupabaseClient<Database>,
  name: string,
): Promise<string> {
  const { data: existing, error: lookupError } = await service
    .from("body_zones")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return existing.id;

  const { data: created, error: insertError } = await service
    .from("body_zones")
    .insert({ name })
    .select("id")
    .single();
  if (insertError) throw insertError;
  return created.id;
}

async function ensurePackageTemplate(
  service: SupabaseClient<Database>,
  zoneId: string,
) {
  const { data: existingTemplate, error: templateLookupError } = await service
    .from("package_templates")
    .select("id")
    .eq("name", E2E_PACKAGE_TEMPLATE_NAME)
    .maybeSingle();
  if (templateLookupError) throw templateLookupError;
  if (existingTemplate) return;

  const { error: insertError } = await service
    .from("package_templates")
    .insert({
      zone_id: zoneId,
      name: E2E_PACKAGE_TEMPLATE_NAME,
      default_sessions: E2E_PACKAGE_TEMPLATE_SESSIONS,
      price: E2E_PACKAGE_TEMPLATE_PRICE,
    });
  if (insertError) throw insertError;
}

async function ensureExpenseCategory(
  service: SupabaseClient<Database>,
  name: string,
) {
  const { data: existing, error: lookupError } = await service
    .from("expense_categories")
    .select("id")
    .eq("name", name)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return;

  const { error: insertError } = await service
    .from("expense_categories")
    .insert({ name });
  if (insertError) throw insertError;
}
