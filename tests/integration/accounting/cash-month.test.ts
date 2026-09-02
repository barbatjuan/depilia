import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedStaffMember } from "../helpers/fixtures";
import { getCashMonthReport } from "@/features/accounting/data/cash-month";

const db = createServiceRoleClient();

describe.sequential("getCashMonthReport", () => {
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

  it("ranges by business_date, classifying each closed day's frozen difference", async () => {
    // No payments/expenses on these dates, so the close trigger's theoretical
    // is opening_amount +/- that session's own movements — fully predictable.
    const { data: sobrante } = await db
      .from("cash_sessions")
      .insert({ business_date: "2026-06-05", opening_amount: 10000, opened_by: staffId })
      .select("id")
      .single();
    const { data: faltante } = await db
      .from("cash_sessions")
      .insert({ business_date: "2026-06-10", opening_amount: 8000, opened_by: staffId })
      .select("id")
      .single();

    // Movements must land while the session is still open — the
    // `cash_movements_require_open_session` trigger rejects them otherwise —
    // so seed these before closing.
    const { error: movErr } = await db.from("cash_movements").insert([
      {
        session_id: sobrante!.id,
        kind: "ingreso",
        direction: "in",
        amount: 1000,
        reason: "Aporte",
        created_by: staffId,
      },
      {
        session_id: faltante!.id,
        kind: "retiro",
        direction: "out",
        amount: 300,
        reason: "Pago a cadete",
        created_by: staffId,
      },
    ]);
    if (movErr) throw movErr;

    // sobrante: theoretical = 10000 opening + 1000 ingreso = 11000; counted
    // 11500 -> difference +500.
    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 11500, closed_by: staffId })
      .eq("id", sobrante!.id);
    // faltante: theoretical = 8000 opening - 300 retiro = 7700; counted
    // 7500 -> difference -200.
    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 7500, closed_by: staffId })
      .eq("id", faltante!.id);

    // Still open — counts as an open day, not a closed one.
    await db
      .from("cash_sessions")
      .insert({ business_date: "2026-06-15", opening_amount: 5000, opened_by: staffId });

    // Out of range — must not be counted.
    const { data: outOfRange } = await db
      .from("cash_sessions")
      .insert({ business_date: "2026-07-01", opening_amount: 5000, opened_by: staffId })
      .select("id")
      .single();
    await db
      .from("cash_sessions")
      .update({ status: "closed", counted_amount: 9999, closed_by: staffId })
      .eq("id", outOfRange!.id);

    await db.from("cash_movements").insert([
      {
        session_id: sobrante!.id,
        kind: "ingreso",
        direction: "in",
        amount: 1000,
        reason: "Aporte",
        created_by: staffId,
      },
      {
        session_id: faltante!.id,
        kind: "retiro",
        direction: "out",
        amount: 300,
        reason: "Pago a cadete",
        created_by: staffId,
      },
    ]);

    const summary = await getCashMonthReport(db, "2026-06");

    expect(summary.closedDays).toBe(2);
    expect(summary.openDays).toBe(1);
    expect(summary.sobrantes).toBe(1);
    expect(summary.faltantes).toBe(1);
    expect(summary.arqueoNet).toBe(300); // +500 sobrante - 200 faltante
    expect(summary.manualIn).toBe(1000);
    expect(summary.manualOut).toBe(300);
  });

  it("returns all zeros for a month with no cash activity", async () => {
    const summary = await getCashMonthReport(db, "2026-06");
    expect(summary).toEqual({
      closedDays: 0,
      openDays: 0,
      arqueoNet: 0,
      arqueoAbs: 0,
      sobrantes: 0,
      faltantes: 0,
      exactos: 0,
      manualIn: 0,
      manualOut: 0,
    });
  });
});
