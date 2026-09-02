import { test, expect, type Page, type Locator } from "@playwright/test";
import { formatInTimeZone } from "date-fns-tz";
import {
  E2E_ADMIN_EMAIL,
  E2E_ADMIN_PASSWORD,
  E2E_EXPENSE_CATEGORY_NAME,
  E2E_PACKAGE_TEMPLATE_NAME,
  E2E_PACKAGE_TEMPLATE_PRICE,
  E2E_PACKAGE_TEMPLATE_SESSIONS,
  E2E_PACKAGE_TEMPLATE_ZONE,
} from "./global-setup";
import { formatMoney, parseMoney } from "./money";

const CLINIC_TZ = "America/Argentina/Buenos_Aires";

/**
 * The full MVP golden path, end to end, against the real local Supabase
 * stack — this is the most important test in the suite: it proves the
 * session ledger (Postgres trigger) works correctly *through the actual
 * UI*, not only in isolation the way the integration tests exercise it.
 *
 * login -> create client -> sell a package -> book an appointment against
 * that package -> complete it -> remaining sessions decremented by exactly
 * 1 (verified by reloading the ficha) -> register a payment against the
 * sale -> balance owed reflects it -> create an expense -> dashboard KPIs
 * reflect everything created above.
 */
test("golden path: client -> package -> appointment -> completion -> payment -> expense -> dashboard", async ({
  page,
}) => {
  const runId = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  const firstName = "E2E";
  const lastName = `Golden ${runId}`;
  const fullClientName = `${firstName} ${lastName}`;

  await test.step("login as the seeded local admin", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(E2E_ADMIN_EMAIL);
    await page.getByLabel("Contraseña").fill(E2E_ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Ingresar" }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  let clientId = "";

  await test.step("create a client", async () => {
    await page.goto("/clientes/nuevo");
    await page.getByLabel("Nombre").fill(firstName);
    await page.getByLabel("Apellido").fill(lastName);
    await page.getByLabel("Sexo").click();
    await page.getByRole("option", { name: "Mujer", exact: true }).click();
    await page.getByLabel("Teléfono").fill("+54 9 11 5555-0000");
    await page.getByRole("button", { name: "Crear cliente" }).click();

    await expect(page).toHaveURL(/\/clientes\/[0-9a-f-]{36}$/);
    clientId = new URL(page.url()).pathname.split("/").pop()!;
    await expect(
      page.getByRole("heading", { name: fullClientName }),
    ).toBeVisible();
  });

  await test.step("sell that client a package", async () => {
    await page.getByRole("button", { name: "Vender paquete" }).click();
    const sellDialog = page.getByRole("dialog");

    // Migration 0013 seeds an "Axilas" tariff for each gender; pick the
    // gender first so the size-grouped Paquete Select shows exactly one
    // Axilas option (mujer — matches E2E_PACKAGE_TEMPLATE_GENDER).
    await sellDialog.getByRole("button", { name: "Mujer" }).click();
    await sellDialog.getByRole("combobox", { name: "Paquete" }).click();
    await page
      .getByRole("option", { name: new RegExp(`^${E2E_PACKAGE_TEMPLATE_NAME}`) })
      .click();
    await sellDialog.getByRole("button", { name: "Vender paquete" }).click();

    await expect(sellDialog).toBeHidden();
    await expect(
      page.getByText(
        `${E2E_PACKAGE_TEMPLATE_SESSIONS} de ${E2E_PACKAGE_TEMPLATE_SESSIONS} sesiones restantes`,
      ),
    ).toBeVisible();
  });

  await test.step("book an appointment for that client against the package", async () => {
    await page.goto("/agenda");
    await page.getByRole("button", { name: "Nuevo turno" }).click();
    const bookDialog = page.getByRole("dialog");

    await bookDialog.getByRole("combobox", { name: "Cliente" }).click();
    await page
      .getByRole("option", { name: fullClientName, exact: true })
      .click();

    // The client's recorded sex ("mujer") drives the zone filter — no
    // separate "Sexo" step for a client that already has one on file.
    await bookDialog.getByRole("combobox", { name: "Zona" }).click();
    await page
      .getByRole("option", { name: E2E_PACKAGE_TEMPLATE_ZONE, exact: true })
      .click();

    const { dateParam } = pickTodaySlot();
    await page.locator("#bookDate").fill(dateParam);
    await bookDialog.getByRole("combobox", { name: "Hora" }).click();
    // Pick whichever slot the picker actually offers — it now filters out
    // times taken by other turnos that same day, so a pre-computed random
    // guess could land on an occupied slot and never appear as an option.
    await page.getByRole("option").first().click();

    await bookDialog.getByRole("combobox", { name: "Sesión" }).click();
    await page
      .getByRole("option", {
        name: new RegExp(`^Paquete ${E2E_PACKAGE_TEMPLATE_ZONE}`),
      })
      .click();

    await bookDialog.getByRole("button", { name: "Crear turno" }).click();
    await expect(bookDialog).toBeHidden();

    // Booked for "today" (BA calendar day) so the dashboard's "Turnos hoy"
    // KPI picks it up later in this same test.
    await expect(page).toHaveURL(/\/agenda/);
  });

  await test.step("mark the appointment as completed and verify remaining sessions decremented by exactly 1", async () => {
    const appointmentCard = findAppointmentCard(page, fullClientName);
    await appointmentCard
      .getByRole("button", { name: "Completar" })
      .click();
    await expect(appointmentCard.getByText("Completado")).toBeVisible();

    await page.goto(`/clientes/${clientId}`);
    const remaining = E2E_PACKAGE_TEMPLATE_SESSIONS - 1;
    await expect(
      page.getByText(
        `${remaining} de ${E2E_PACKAGE_TEMPLATE_SESSIONS} sesiones restantes`,
      ),
    ).toBeVisible();
  });

  let saleAmountPaid = 0;
  let saleBalanceRemaining = 0;

  await test.step("register a payment against the resulting sale and verify the balance owed reflects it", async () => {
    await page
      .getByRole("link", { name: new RegExp(`Paquete ${E2E_PACKAGE_TEMPLATE_NAME}`) })
      .click();
    await expect(page).toHaveURL(/\/ventas\/[0-9a-f-]{36}$/);

    saleAmountPaid = Math.round(E2E_PACKAGE_TEMPLATE_PRICE * 0.6);
    saleBalanceRemaining = E2E_PACKAGE_TEMPLATE_PRICE - saleAmountPaid;
    // Sanity-check our chosen partial amount actually leaves a nonzero
    // balance for this fixture's price.
    expect(saleBalanceRemaining).toBeGreaterThan(0);

    await page.getByLabel("Monto").fill(String(saleAmountPaid));
    await page.getByRole("button", { name: "Registrar pago" }).click();

    await expect(page.getByText("Parcial")).toBeVisible();
    await expect(
      page
        .getByText(formatMoney(saleBalanceRemaining), {
          exact: true,
        })
        .first(),
    ).toBeVisible();
  });

  await test.step("verify the ficha's stats and timeline reflect the visit, sale and payment", async () => {
    await page.goto(`/clientes/${clientId}`);

    await expect(page.getByText(/1 visitas/)).toBeVisible();
    await expect(
      page.getByText(formatMoney(saleAmountPaid), { exact: true }).first(),
    ).toBeVisible();

    const timelineCard = page.locator('[data-slot="card"]', {
      hasText: "Timeline",
    });
    await expect(timelineCard.locator("li")).toHaveCount(3);
  });

  await test.step("create an expense", async () => {
    await page.goto("/gastos/nuevo");
    await page.getByRole("combobox", { name: "Categoría" }).click();
    await page
      .getByRole("option", { name: E2E_EXPENSE_CATEGORY_NAME, exact: true })
      .click();
    await page.getByLabel("Monto").fill("5000");
    const { dateParam } = pickTodaySlot();
    await page.getByLabel("Fecha").fill(dateParam);
    const expenseDescription = `E2E gasto de prueba ${runId}`;
    await page.getByLabel("Descripción").fill(expenseDescription);
    await page.getByRole("button", { name: "Crear gasto" }).click();

    await expect(page).toHaveURL(/\/gastos$/);
    await expect(page.getByText(expenseDescription)).toBeVisible();
  });

  await test.step("visit the dashboard and verify the KPIs reflect the data created during the flow", async () => {
    await page.goto("/dashboard");

    const todayAppointments = await getKpiValue(page, "Turnos hoy");
    expect(Number(todayAppointments)).toBeGreaterThanOrEqual(1);

    const activeClients = await getKpiValue(page, "Clientes activos");
    expect(Number(activeClients)).toBeGreaterThanOrEqual(1);

    const monthRevenueText = await getKpiValue(page, "Ingresos del mes");
    const monthRevenue = parseMoney(monthRevenueText);
    expect(monthRevenue).toBeGreaterThan(0);
    expect(monthRevenue).toBeGreaterThanOrEqual(saleAmountPaid);
  });
});

/** Today's Buenos Aires calendar date, for the booking/expense date fields. */
function pickTodaySlot(): { dateParam: string } {
  const dateParam = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
  return {
    dateParam,
  };
}

/**
 * Locates the agenda's `<AppointmentCard>` for a given client by its
 * distinctive outer wrapper + client name text — there's no dedicated test
 * id on this component, so this mirrors how an admin would visually find
 * the right card among the day's appointments.
 */
function findAppointmentCard(page: Page, clientName: string): Locator {
  return page.locator("div.rounded-md.border.p-3", { hasText: clientName });
}

async function getKpiValue(page: Page, label: string): Promise<string> {
  const card = page.locator('[data-slot="card"]', { hasText: label });
  const value = await card.locator('[data-slot="card-content"] div').first().innerText();
  return value.trim();
}
