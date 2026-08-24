import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import { resetDatabase, seedAppointment, seedClient, seedZone } from "./helpers/fixtures";
import { claimReminder } from "@/features/reminders/data/claim-reminder";

/**
 * Covers spec scenario "Idempotent on rerun" under `appointment-reminders`:
 * the `reminder_log` unique (appointment_id, channel, send_date) constraint
 * must make a second claim attempt for the same appointment/date a no-op,
 * never a second row / second email — exercised against the real Postgres
 * unique constraint, not mocked.
 */
describe.sequential("claimReminder (reminder_log claim-then-send idempotency)", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function setupAppointment() {
    const zone = await seedZone(db, "underarms");
    const client = await seedClient(db);
    const appointment = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
    return appointment;
  }

  it("claims the reminder on the first attempt", async () => {
    const appointment = await setupAppointment();

    const result = await claimReminder(db, {
      appointmentId: appointment.id,
      sendDate: "2026-08-25",
    });

    expect(result.claimed).toBe(true);
    expect(result.id).not.toBeNull();

    const { data: rows } = await db
      .from("reminder_log")
      .select("appointment_id, channel, send_date, status")
      .eq("appointment_id", appointment.id);
    expect(rows).toEqual([
      {
        appointment_id: appointment.id,
        channel: "email",
        send_date: "2026-08-25",
        status: "pending",
      },
    ]);
  });

  it("does not claim (and does not insert a second row) on a repeated attempt for the same date", async () => {
    const appointment = await setupAppointment();

    const first = await claimReminder(db, {
      appointmentId: appointment.id,
      sendDate: "2026-08-25",
    });
    const second = await claimReminder(db, {
      appointmentId: appointment.id,
      sendDate: "2026-08-25",
    });

    expect(first.claimed).toBe(true);
    expect(second.claimed).toBe(false);
    expect(second.id).toBeNull();

    const { data: rows } = await db
      .from("reminder_log")
      .select("id")
      .eq("appointment_id", appointment.id);
    expect(rows).toHaveLength(1);
  });

  it("allows claiming again for a different send_date (different day, different appointment occurrence)", async () => {
    const appointment = await setupAppointment();

    await claimReminder(db, { appointmentId: appointment.id, sendDate: "2026-08-25" });
    const nextDay = await claimReminder(db, {
      appointmentId: appointment.id,
      sendDate: "2026-08-26",
    });

    expect(nextDay.claimed).toBe(true);

    const { data: rows } = await db
      .from("reminder_log")
      .select("send_date")
      .eq("appointment_id", appointment.id);
    expect(rows).toHaveLength(2);
  });
});
