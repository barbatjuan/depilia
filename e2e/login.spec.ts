import { test, expect } from "@playwright/test";

// Requires a local admin user + matching `staff` row (see README:
// "First-run local setup"). Credentials come from env so CI/dev can seed
// their own without hardcoding secrets in the repo.
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@depilia.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "TestPassword123!";

test("unauthenticated request to a protected route redirects to /login", async ({
  page,
}) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(
    page.getByText("Ingresá con tu cuenta de administración."),
  ).toBeVisible();
});

test("valid login reaches the dashboard", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  await page.getByLabel("Contraseña").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Ingresar" }).click();

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByText("Turnos hoy")).toBeVisible();
});
