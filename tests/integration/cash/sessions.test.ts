import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedStaffMember } from "../helpers/fixtures";

const db = createServiceRoleClient();
const today = () => new Date().toISOString().slice(0, 10);

describe.sequential("cash_sessions: one caja per business_date", () => {
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

  it("creates an open session with the operator-entered opening_amount", async () => {
    const { data, error } = await db
      .from("cash_sessions")
      .insert({
        business_date: today(),
        opening_amount: 5000,
        opened_by: staffId,
      })
      .select("status, opening_amount, opened_by")
      .single();

    expect(error).toBeNull();
    expect(data?.status).toBe("open");
    expect(Number(data?.opening_amount)).toBe(5000);
    expect(data?.opened_by).toBe(staffId);
  });

  it("rejects a second session for a business_date that already has one", async () => {
    await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: 5000, opened_by: staffId });

    const { error } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: 9000, opened_by: staffId });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505");
  });

  it("rejects a negative opening_amount", async () => {
    const { error } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: -1, opened_by: staffId });

    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });
});
