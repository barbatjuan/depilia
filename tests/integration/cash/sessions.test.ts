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

  it("re-opens a closed caja and clears its arqueo snapshot", async () => {
    const { data: opened } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: 5000, opened_by: staffId })
      .select("id")
      .single();

    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 4200, closed_by: staffId })
      .eq("id", opened!.id);

    const { data: reopened, error } = await db
      .from("cash_sessions")
      .update({ status: "open" })
      .eq("id", opened!.id)
      .select("status, counted_amount, theoretical_amount, difference, closed_at")
      .single();

    expect(error).toBeNull();
    expect(reopened?.status).toBe("open");
    expect(reopened?.counted_amount).toBeNull();
    expect(reopened?.theoretical_amount).toBeNull();
    expect(reopened?.difference).toBeNull();
    expect(reopened?.closed_at).toBeNull();
  });

  it("still rejects editing a closed caja that is not being re-opened", async () => {
    const { data: opened } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: 5000, opened_by: staffId })
      .select("id")
      .single();

    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 4200, closed_by: staffId })
      .eq("id", opened!.id);

    const { error } = await db
      .from("cash_sessions")
      .update({ closing_note: "tampering with a closed caja" })
      .eq("id", opened!.id);

    expect(error).not.toBeNull();
  });
});
