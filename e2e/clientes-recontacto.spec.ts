import { test, expect } from "@playwright/test";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  serviceRoleClient,
} from "./global-setup";
import type { Database } from "../src/lib/supabase/types";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const PHONE = "+5491166669999";

/** Clears any leftover fixture from a previous (possibly failed) run. FKs
 * are ON DELETE RESTRICT all the way down, so delete children first:
 * appointments -> client_packages -> clients -> the dedicated zone. */
async function clearReconFixture(service: SupabaseClient<Database>) {
  const { data: stale } = await service
    .from("clients")
    .select("id")
    .like("last_name", "RECON-E2E-%");
  for (const row of stale ?? []) {
    await service.from("appointments").delete().eq("client_id", row.id);
    await service.from("client_packages").delete().eq("client_id", row.id);
    await service.from("clients").delete().eq("id", row.id);
  }
  await service.from("body_zones").delete().like("name", "RECON-E2E-%");
}

/** A client with an active 6-session bono (2 used) whose only session in a
 * 6-week-cadence zone was ~14 weeks ago — well past 2x the interval, so it
 * lands in the 🔴 "overdue" bucket regardless of demo-data churn. */
async function seedOverdueBono(service: SupabaseClient<Database>) {
  const tag = `RECON-E2E-${Date.now()}`;

  const { data: zone, error: zoneErr } = await service
    .from("body_zones")
    .insert({ name: tag, recommended_weeks: 6 })
    .select("id")
    .single();
  if (zoneErr) throw zoneErr;

  const { data: client, error: clientErr } = await service
    .from("clients")
    .insert({
      first_name: "Recon",
      last_name: tag,
      gender: "mujer",
      phone: PHONE,
    })
    .select("id")
    .single();
  if (clientErr) throw clientErr;

  const { data: pkg, error: pkgErr } = await service
    .from("client_packages")
    .insert({
      client_id: client!.id,
      zone_id: zone!.id,
      total_sessions: 6,
      sessions_used: 2,
    })
    .select("id")
    .single();
  if (pkgErr) throw pkgErr;

  const { error: apptErr } = await service.from("appointments").insert({
    client_id: client!.id,
    client_package_id: pkg!.id,
    zone_id: zone!.id,
    scheduled_at: new Date(Date.now() - 14 * WEEK_MS).toISOString(),
    duration_minutes: 30,
    status: "completed",
  });
  if (apptErr) throw apptErr;

  return client!.id as string;
}

test("recontacto por zona: overdue bono shows red, has a WhatsApp link, filter works", async ({
  page,
}) => {
  const service = serviceRoleClient();
  await clearReconFixture(service);
  await seedOverdueBono(service);

  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("bono shows up red with a WhatsApp link", async () => {
    await page.goto("/clientes/recontacto");
    await expect(page.getByText(/^Recon RECON-E2E-/)).toBeVisible();
    await expect(
      page.locator('[data-slot="badge"]', { hasText: "Muy atrasado" }),
    ).toBeVisible();
    // Unique phone -> the exact wa.me href proves this row is the seeded one.
    await expect(
      page.locator('a[href="https://wa.me/5491166669999"]'),
    ).toBeVisible();
  });

  await test.step("estado filter narrows the list", async () => {
    await page.goto("/clientes/recontacto?estado=overdue");
    await expect(page.getByText(/^Recon RECON-E2E-/)).toBeVisible();
    await page.goto("/clientes/recontacto?estado=due");
    await expect(page.getByText(/^Recon RECON-E2E-/)).not.toBeVisible();
  });

  await clearReconFixture(service);
});
