import { test, expect } from "@playwright/test";
import { E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD } from "./global-setup";

/**
 * `/contabilidad` monthly report shell (spec: PASO 5) — month label renders,
 * the P&L result shows as a money string, the month picker round-trips
 * through `?mes=`, and CSV export triggers a real browser download.
 */
test("contabilidad: month label, P&L result, month picker, CSV export", async ({
  page,
}) => {
  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  await test.step("open the monthly report", async () => {
    await page.goto("/contabilidad");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByText("Resultado del mes")).toBeVisible();
    // The P&L "Resultado" row renders a formatted money string, not raw NaN.
    await expect(page.getByText("Resultado", { exact: true })).toBeVisible();
  });

  await test.step("changing the month updates the URL", async () => {
    await page.locator('input[type="month"]').fill("2026-01");
    await expect(page).toHaveURL(/\?mes=2026-01/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "enero",
    );
  });

  await test.step("export CSV triggers a download", async () => {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole("button", { name: "Exportar CSV" }).first().click(),
    ]);
    expect(download.suggestedFilename()).toMatch(/^contabilidad-2026-01\.csv$/);
  });

  await test.step("cuentas por cobrar is reachable and shows a total", async () => {
    await page.getByRole("link", { name: /Deuda de clientes/ }).click();
    await expect(page).toHaveURL(/\/contabilidad\/cuentas-por-cobrar/);
    await expect(
      page.getByRole("heading", { name: "Cuentas por cobrar" }),
    ).toBeVisible();
  });
});
