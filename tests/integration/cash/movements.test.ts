import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedStaffMember } from "../helpers/fixtures";

const db = createServiceRoleClient();
const today = () => new Date().toISOString().slice(0, 10);

async function openSession(staffId: string, businessDate = today()) {
  const { data, error } = await db
    .from("cash_sessions")
    .insert({ business_date: businessDate, opening_amount: 10000, opened_by: staffId })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

describe.sequential("cash_movements: kind/direction/amount invariants", () => {
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

  it("accepts a retiro/out and an ingreso/in movement on an open session", async () => {
    const sessionId = await openSession(staffId);

    const retiro = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "retiro",
      direction: "out",
      amount: 1000,
      reason: "pago cadete",
      created_by: staffId,
    });
    const ingreso = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ingreso",
      direction: "in",
      amount: 500,
      reason: "aporte socio",
      created_by: staffId,
    });

    expect(retiro.error).toBeNull();
    expect(ingreso.error).toBeNull();
  });

  it("accepts an ajuste in either direction (bidirectional)", async () => {
    const sessionId = await openSession(staffId);

    const down = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ajuste",
      direction: "out",
      amount: 250,
      reason: "faltante de caja",
      created_by: staffId,
    });
    const up = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ajuste",
      direction: "in",
      amount: 120,
      reason: "sobrante de caja",
      created_by: staffId,
    });

    expect(down.error).toBeNull();
    expect(up.error).toBeNull();
  });

  it("rejects a non-positive amount", async () => {
    const sessionId = await openSession(staffId);

    const { error } = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ingreso",
      direction: "in",
      amount: 0,
      reason: "cero",
      created_by: staffId,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("rejects a retiro tagged with direction 'in' (kind_matches_direction)", async () => {
    const sessionId = await openSession(staffId);

    const { error } = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "retiro",
      direction: "in",
      amount: 100,
      reason: "incoherente",
      created_by: staffId,
    });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("rejects a movement inserted on a closed session", async () => {
    const sessionId = await openSession(staffId);
    const { error: closeError } = await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 10000 })
      .eq("id", sessionId);
    expect(closeError).toBeNull();

    const { error } = await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ingreso",
      direction: "in",
      amount: 100,
      reason: "tarde",
      created_by: staffId,
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("not open");
  });
});
