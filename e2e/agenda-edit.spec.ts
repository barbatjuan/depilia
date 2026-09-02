import { test, expect } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import { serviceRoleClient, E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

const CLINIC_TZ = "America/Argentina/Buenos_Aires";

/**
 * A scheduled turno can be confirmed (and un-confirmed) and edited to a new
 * time — the gap the redesign closed (before this, "Reprogramar" only
 * changed the time and there was no confirmation state).
 */
test("agenda: confirm and edit a scheduled turno", async ({ page }) => {
  const service = serviceRoleClient();
  const runId = String(Date.now());

  // Seed a client + a scheduled turno for today, directly (no UI setup).
  const { data: client } = await service
    .from("clients")
    .insert({ first_name: "Edit", last_name: `Turno ${runId}`, gender: "mujer" })
    .select("id")
    .single();
  const { data: zone } = await service
    .from("body_zones")
    .upsert({ name: "Axilas" }, { onConflict: "name" })
    .select("id")
    .single();
  const today = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
  await service.from("appointments").insert({
    client_id: client!.id,
    zone_id: zone!.id,
    scheduled_at: `${today}T18:00:00-03:00`,
    duration_minutes: 30,
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/agenda");
  const card = page
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: `Edit Turno ${runId}` });
  await expect(card).toBeVisible();
  await expect(card.getByText("Sin confirmar")).toBeVisible();

  await card.getByRole("button", { name: "Confirmar" }).click();
  await expect(card.getByText("Confirmada")).toBeVisible();

  await card.getByRole("button", { name: "Editar" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("combobox", { name: "Hora" }).click();
  await page.getByRole("option", { name: "19:15", exact: true }).click();
  await sheet.getByRole("button", { name: "Guardar cambios" }).click();
  await expect(sheet).toBeHidden();

  // The edited turno still shows, still confirmed, now at 19:15.
  const edited = page
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: `Edit Turno ${runId}` });
  await expect(edited.getByText("19:15")).toBeVisible();
  await expect(edited.getByText("Confirmada")).toBeVisible();

  await service.from("appointments").delete().eq("client_id", client!.id);
  await service.from("clients").delete().eq("id", client!.id);
});

/**
 * The time picker hides slots that would overlap another already-scheduled
 * turno that same day (single-chair clinic — the DB EXCLUDE constraint in
 * migration 0005 backs this, but the picker now filters before submit too).
 */
test("agenda: edit picker hides slots taken by another turno", async ({ page }) => {
  const service = serviceRoleClient();
  const runId = String(Date.now());

  const { data: clientA } = await service
    .from("clients")
    .insert({ first_name: "SlotsA", last_name: `Turno ${runId}`, gender: "mujer" })
    .select("id")
    .single();
  const { data: clientB } = await service
    .from("clients")
    .insert({ first_name: "SlotsB", last_name: `Turno ${runId}`, gender: "mujer" })
    .select("id")
    .single();
  const { data: zone } = await service
    .from("body_zones")
    .upsert({ name: "Axilas" }, { onConflict: "name" })
    .select("id")
    .single();
  const today = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
  // Turno A: 18:00-19:00, occupies the whole hour.
  await service.from("appointments").insert({
    client_id: clientA!.id,
    zone_id: zone!.id,
    scheduled_at: `${today}T18:00:00-03:00`,
    duration_minutes: 60,
  });
  // Turno B: 19:15, does not overlap A — this is the one we'll edit.
  await service.from("appointments").insert({
    client_id: clientB!.id,
    zone_id: zone!.id,
    scheduled_at: `${today}T19:15:00-03:00`,
    duration_minutes: 30,
  });

  await page.goto("/login");
  await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/agenda");
  const cardB = page
    .locator("div.rounded-md.border.p-3")
    .filter({ hasText: `SlotsB Turno ${runId}` });
  await expect(cardB).toBeVisible();

  await cardB.getByRole("button", { name: "Editar" }).click();
  const sheet = page.getByRole("dialog");
  const timeCombobox = sheet.getByRole("combobox", { name: "Hora" });
  await timeCombobox.click();

  // 18:15 falls inside turno A (18:00-19:00) — must not be offered.
  await expect(page.getByRole("option", { name: "18:15", exact: true })).toHaveCount(0);
  // 19:00 is free (A ends exactly there) — must be offered.
  await expect(page.getByRole("option", { name: "19:00", exact: true })).toBeVisible();

  await service.from("appointments").delete().in("client_id", [clientA!.id, clientB!.id]);
  await service.from("clients").delete().in("id", [clientA!.id, clientB!.id]);
});
