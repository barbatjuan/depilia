import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";
import type { Database } from "../src/lib/supabase/types";

config({ path: ".env.local" });

const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

/** Clears any leftover fixture from a previous (possibly failed) run —
 * appointments first, `client_id` has no cascade. */
async function clearOverdueFixture(service: SupabaseClient<Database>) {
  const { data: stale } = await service
    .from("clients")
    .select("id")
    .like("last_name", "E2E-%");
  for (const row of stale ?? []) {
    await service.from("appointments").delete().eq("client_id", row.id);
    await service.from("clients").delete().eq("id", row.id);
  }
}

/** Seeds a client whose only completed appointment was 100 days ago, so it
 * lands squarely in the 🔴 bucket regardless of any demo data churn. */
async function seedOverdueClient(service: SupabaseClient<Database>) {
  const { data: client, error: clientErr } = await service
    .from("clients")
    .insert({
      first_name: "Overdue",
      last_name: `E2E-${Date.now()}`,
      gender: "mujer",
      phone: "+5491155551234",
    })
    .select("id")
    .single();
  if (clientErr) throw clientErr;

  const { data: zone, error: zoneErr } = await service
    .from("body_zones")
    .select("id")
    .limit(1)
    .single();
  if (zoneErr) throw zoneErr;

  const scheduledAt = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  const { error: apptErr } = await service.from("appointments").insert({
    client_id: client!.id,
    zone_id: zone!.id,
    scheduled_at: scheduledAt,
    duration_minutes: 30,
    status: "completed",
  });
  if (apptErr) throw apptErr;

  return client!.id as string;
}

test("clientes a recuperar: overdue client shows red, has a WhatsApp link, filter works", async ({
  page,
}) => {
  const service = createClient<Database>(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await clearOverdueFixture(service);
  const clientId = await seedOverdueClient(service);

  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("client shows up red with a WhatsApp link", async () => {
    await page.goto("/clientes/recuperar");
    await expect(page.getByText(/^Overdue E2E-/)).toBeVisible();
    await expect(
      page.locator('[data-slot="badge"]', { hasText: "🔴 Perdido" }),
    ).toBeVisible();
    // Phone is unique test data, so matching the exact wa.me href
    // unambiguously proves it belongs to this seeded client's row.
    await expect(
      page.locator('a[href="https://wa.me/5491155551234"]'),
    ).toBeVisible();
  });

  await test.step("color filter narrows the list", async () => {
    await page.goto("/clientes/recuperar?color=red");
    await expect(page.getByText(/^Overdue E2E-/)).toBeVisible();
    await page.goto("/clientes/recuperar?color=green");
    await expect(page.getByText(/^Overdue E2E-/)).not.toBeVisible();
  });

  await service.from("appointments").delete().eq("client_id", clientId);
  await service.from("clients").delete().eq("id", clientId);
});
