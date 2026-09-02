import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedStaffMember,
} from "../helpers/fixtures";

const db = createServiceRoleClient();
const today = () => new Date().toISOString().slice(0, 10);

async function seedCashExpense(amount: number, method: string, spentOn = today()) {
  const { data: cat } = await db
    .from("expense_categories")
    .insert({ name: `cat-${crypto.randomUUID()}` })
    .select("id")
    .single();
  const { error } = await db
    .from("expenses")
    .insert({ category_id: cat!.id, amount, method, spent_on: spentOn });
  if (error) throw error;
}

async function seedPayment(amount: number, method: string) {
  const client = await seedClient(db);
  const { data: sale } = await db
    .from("sales")
    .insert({ client_id: client.id, description: "Sesión suelta", total: amount })
    .select("id")
    .single();
  const { data: payment, error } = await db
    .from("payments")
    .insert({ sale_id: sale!.id, amount, method })
    .select("id")
    .single();
  if (error) throw error;
  return payment!.id as string;
}

describe.sequential("cash_sessions close: arqueo snapshot", () => {
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

  async function openToday(opening = 5000) {
    const { data, error } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: opening, opened_by: staffId })
      .select("id")
      .single();
    if (error) throw error;
    return data.id as string;
  }

  it("rejects closing with a null counted_amount", async () => {
    const id = await openToday();

    const { error } = await db
      .from("cash_sessions")
      .update({ status: "closed" })
      .eq("id", id);

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("counted_amount");

    const { data } = await db
      .from("cash_sessions")
      .select("status")
      .eq("id", id)
      .single();
    expect(data?.status).toBe("open");
  });

  it("derives theoretical from cash only (view), then snapshots it at close", async () => {
    const id = await openToday(5000);
    await seedPayment(3000, "cash");
    await seedPayment(9000, "transfer");
    await seedCashExpense(1000, "cash");
    await seedCashExpense(4000, "transfer");

    const { data: view } = await db
      .from("cash_session_theoretical")
      .select("theoretical_amount")
      .eq("session_id", id)
      .single();
    // 5000 + 3000 (cash) - 1000 (cash expense); transfer excluded
    expect(Number(view?.theoretical_amount)).toBe(7000);

    const { error } = await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 6800, closed_by: staffId })
      .eq("id", id);
    expect(error).toBeNull();

    const { data: closed } = await db
      .from("cash_sessions")
      .select("theoretical_amount, difference, closed_at")
      .eq("id", id)
      .single();
    expect(Number(closed?.theoretical_amount)).toBe(7000);
    expect(Number(closed?.difference)).toBe(-200);
    expect(closed?.closed_at).not.toBeNull();
  });

  it("keeps the snapshot immutable when a same-day payment is edited after close", async () => {
    const id = await openToday(5000);
    const paymentId = await seedPayment(3000, "cash");

    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 8000, closed_by: staffId })
      .eq("id", id);

    // theoretical was 5000 + 3000 = 8000, difference 0
    await db.from("payments").update({ amount: 9999 }).eq("id", paymentId);

    const { data: after } = await db
      .from("cash_sessions")
      .select("theoretical_amount, difference")
      .eq("id", id)
      .single();
    expect(Number(after?.theoretical_amount)).toBe(8000);
    expect(Number(after?.difference)).toBe(0);
  });
});
