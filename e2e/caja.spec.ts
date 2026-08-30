import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { formatInTimeZone } from "date-fns-tz";
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  ensureOpenCajaToday,
} from "./global-setup";
import type { Database } from "../src/lib/supabase/types";

config({ path: ".env.local" });

const CLINIC_TZ = "America/Argentina/Buenos_Aires";

const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UtZGVtbyIsImlhdCI6MTY0MTc2OTIwMCwiZXhwIjoxNzk5NTM1NjAwfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X36XVt4Q";

/**
 * Clears any cash session (and its movements) for today's BA business date so
 * this spec always starts from the "no caja abierta" state — `cash_sessions`
 * close is terminal, so a leftover row from a previous local run would
 * otherwise hide the "Abrir caja" form. Mirrors `global-setup`'s
 * service-role, idempotent-seed approach.
 */
async function resetTodayCaja(service: SupabaseClient<Database>, businessDate: string) {
  const { data: sessions } = await service
    .from("cash_sessions")
    .select("id")
    .eq("business_date", businessDate);
  for (const session of sessions ?? []) {
    await service.from("cash_movements").delete().eq("session_id", session.id);
  }
  await service.from("cash_sessions").delete().eq("business_date", businessDate);
}

test("caja diaria: abrir -> movimiento -> cerrar con arqueo", async ({ page }) => {
  const businessDate = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
  const service = createClient<Database>(LOCAL_URL, LOCAL_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await resetTodayCaja(service, businessDate);

  await test.step("login as the seeded local admin", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("abrir la caja con un monto de apertura", async () => {
    await page.goto("/caja");
    await expect(
      page.getByText("Todavía no abriste la caja de hoy."),
    ).toBeVisible();
    await page.getByLabel("Monto de apertura").fill("20000");
    await page.getByRole("button", { name: "Abrir caja" }).click();

    await expect(
      page.getByRole("button", { name: "Registrar movimiento" }),
    ).toBeVisible();
    await expect(page.getByText("Teórico", { exact: false }).first()).toBeVisible();
  });

  await test.step("registrar un retiro de 5000", async () => {
    await page.getByLabel("Monto", { exact: true }).fill("5000");
    await page.getByLabel("Motivo").fill("Pago a proveedor en efectivo");
    await page.getByRole("button", { name: "Registrar movimiento" }).click();

    await expect(
      page.getByRole("cell", { name: "Pago a proveedor en efectivo" }),
    ).toBeVisible();
    await expect(page.getByRole("cell", { name: /^-/ })).toBeVisible();
  });

  await test.step("cerrar la caja con un arqueo con faltante", async () => {
    // Read the live theoretical the page shows (opening 20000 - 5000 retiro,
    // plus whatever cash payments already exist today) and count well below
    // it so the arqueo is unambiguously a faltante.
    const openSummary = page.locator('[data-slot="card"]', {
      hasText: "Balance teórico en vivo",
    });
    const theoreticalText = await openSummary
      .locator("span.tabular-nums")
      .last()
      .innerText();
    const theoretical = Number(theoreticalText.replace(/[^\d]/g, ""));
    expect(theoretical).toBeGreaterThan(0);

    const counted = 100;
    const shortfall = theoretical - counted;

    await page.getByLabel("Monto contado").fill(String(counted));
    await page.getByRole("button", { name: "Cerrar caja" }).click();

    const summary = page.locator('[data-slot="card"]', { hasText: "Arqueo final" });
    await expect(summary.getByText("Faltante")).toBeVisible();
    await expect(summary.getByText("Resultado")).toBeVisible();
    await expect(
      summary.getByText(new RegExp(`\\$\\s*${shortfall.toLocaleString("es-AR")}`)),
    ).toBeVisible();
  });

  // Restore the shared "caja abierta hoy" fixture the golden path relies on.
  await resetTodayCaja(service, businessDate);
  await ensureOpenCajaToday(service);
});
