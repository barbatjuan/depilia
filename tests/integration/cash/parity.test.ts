import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedClient, seedStaffMember } from "../helpers/fixtures";
import { deriveTheoreticalCash } from "@/features/cash/domain/theoretical-balance";
import { getClinicDayBounds } from "@/features/dashboard/domain/schedule";

// A.7 / B.16 — parity: the `cash_session_theoretical` view, the close-trigger
// snapshot, and the pure `deriveTheoreticalCash()` must all agree on identical
// data, and the SQL BA-day window must match `getClinicDayBounds()`.
const db = createServiceRoleClient();

const bounds = getClinicDayBounds(new Date());
const businessDate = bounds.start.toISOString().slice(0, 10);

async function seedCashExpense(amount: number, method: string) {
  const { data: cat } = await db
    .from("expense_categories")
    .insert({ name: `cat-${crypto.randomUUID()}` })
    .select("id")
    .single();
  const { error } = await db
    .from("expenses")
    .insert({ category_id: cat!.id, amount, method, spent_on: businessDate });
  if (error) throw error;
}

async function seedPayment(amount: number, method: string, paidAt?: string) {
  const client = await seedClient(db);
  const { data: sale } = await db
    .from("sales")
    .insert({ client_id: client.id, description: "Sesión suelta", total: amount })
    .select("id")
    .single();
  const { error } = await db
    .from("payments")
    .insert({ sale_id: sale!.id, amount, method, ...(paidAt ? { paid_at: paidAt } : {}) })
    .select("id")
    .single();
  if (error) throw error;
}

describe.sequential("parity: view === trigger === deriveTheoreticalCash", () => {
  let staffId: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    await resetDatabase(db);
    const staff = await seedStaffMember(db);
    staffId = staff.id;
    cleanup = staff.cleanup;
  });

  afterEach(async () => {
    await resetDatabase(db);
    await cleanup();
  });

  afterAll(async () => {
    await resetDatabase(db);
  });

  async function openSession(opening: number) {
    const { data, error } = await db
      .from("cash_sessions")
      .insert({ business_date: businessDate, opening_amount: opening, opened_by: staffId })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  it("view, close snapshot and the pure fn agree on identical data", async () => {
    const opening = 20000;
    const sessionId = await openSession(opening);

    // cash payments count; transfer is excluded
    await seedPayment(3000, "cash");
    await seedPayment(2500, "cash");
    await seedPayment(9000, "transfer");

    // signed movements
    await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ingreso",
      direction: "in",
      amount: 800,
      reason: "aporte",
      created_by: staffId,
    });
    await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ajuste",
      direction: "out",
      amount: 300,
      reason: "redondeo",
      created_by: staffId,
    });

    // cash expense counts; transfer expense excluded
    await seedCashExpense(1200, "cash");
    await seedCashExpense(4000, "transfer");

    const pure = deriveTheoreticalCash({
      openingAmount: opening,
      cashPayments: [{ amount: 3000 }, { amount: 2500 }],
      movements: [
        { direction: "in", amount: 800 },
        { direction: "out", amount: 300 },
      ],
      cashExpenses: [{ amount: 1200 }],
    });
    // 20000 + 5500 + 500 - 1200
    expect(pure.theoretical).toBe(24800);

    const { data: view } = await db
      .from("cash_session_theoretical")
      .select("theoretical_amount, cash_payments, movements_net, cash_expenses")
      .eq("session_id", sessionId)
      .single();
    expect(Number(view?.theoretical_amount)).toBe(pure.theoretical);
    expect(Number(view?.cash_payments)).toBe(pure.cashIn);
    expect(Number(view?.movements_net)).toBe(pure.movementsNet);
    expect(Number(view?.cash_expenses)).toBe(pure.cashOut);

    const { error: closeError } = await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 24800, closed_by: staffId })
      .eq("id", sessionId);
    expect(closeError).toBeNull();

    const { data: closed } = await db
      .from("cash_sessions")
      .select("theoretical_amount, difference")
      .eq("id", sessionId)
      .single();
    expect(Number(closed?.theoretical_amount)).toBe(pure.theoretical);
    expect(Number(closed?.difference)).toBe(0);
  });

  it("the SQL BA-day window matches getClinicDayBounds (boundary instants)", async () => {
    const sessionId = await openSession(0);

    // one payment 1ms before the BA-day start (yesterday), one exactly at start
    const justBefore = new Date(bounds.start.getTime() - 1).toISOString();
    const atStart = bounds.start.toISOString();
    await seedPayment(111, "cash", justBefore);
    await seedPayment(222, "cash", atStart);

    const { data: view } = await db
      .from("cash_session_theoretical")
      .select("cash_payments")
      .eq("session_id", sessionId)
      .single();

    // only the in-window payment (222) is counted, matching the JS bounds
    expect(Number(view?.cash_payments)).toBe(222);
  });
});
