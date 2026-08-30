import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

/**
 * Tariff ABM (spec service-catalog R4): create a tariff for a brand-new body
 * zone via the combobox, see it in the size-grouped Mujer list, then archive
 * it. Runs against the real local Supabase stack.
 */
test("tarifas ABM: add a tariff for a new zone, see it listed, archive it", async ({
  page,
}) => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const zoneName = `Zona E2E ${runId}`;

  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("reach the tariff list from configuración", async () => {
    await page.goto("/configuracion");
    await page.getByRole("link", { name: "Administrar tarifas" }).click();
    await expect(page).toHaveURL(/\/configuracion\/tarifas/);
    await expect(
      page.getByRole("heading", { name: "Tarifas" }),
    ).toBeVisible();
  });

  await test.step("create a tariff for a new zone", async () => {
    await page.getByRole("link", { name: "Agregar tarifa" }).click();
    await expect(page).toHaveURL(/\/configuracion\/tarifas\/nueva$/);

    await page.getByLabel("Zona").fill(zoneName);
    await page.getByRole("button", { name: "Mujer" }).click();
    await page.getByRole("combobox", { name: "Tamaño" }).click();
    await page.getByRole("option", { name: "Mini" }).click();
    await page.getByLabel("Precio por sesión").fill("7");
    await page.getByLabel("Precio del bono").fill("36");
    await page.getByRole("button", { name: "Crear tarifa" }).click();

    await expect(page).toHaveURL(/\/configuracion\/tarifas(\?|$)/);
    await expect(page.getByRole("cell", { name: zoneName })).toBeVisible();
  });

  await test.step("archive the tariff", async () => {
    const row = page.getByRole("row", { name: new RegExp(zoneName) });
    await row.getByRole("button", { name: "Archivar" }).click();
    await expect(page.getByRole("cell", { name: zoneName })).toBeHidden();
  });
});
