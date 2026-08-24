import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import {
  resetDatabase,
  seedAppointment,
  seedClient,
  seedClientPackage,
  seedZone,
} from "./helpers/fixtures";

/**
 * Covers spec scenarios under `package-sessions` (Session decrement/restore)
 * and design's "Session Ledger" required-behavior table, exercised against
 * the real `set_appointment_status` RPC and its `BEFORE UPDATE` trigger.
 */
describe.sequential("session ledger trigger (set_appointment_status RPC)", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function setupPackageWithAppointment(totalSessions: number, used: number) {
    const zone = await seedZone(db, "underarms");
    const client = await seedClient(db);
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: totalSessions,
      sessions_used: used,
    });
    const appointment = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      client_package_id: pkg.id,
      scheduled_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    });
    return { zone, client, pkg, appointment };
  }

  it("completing an appointment decrements sessions_used by exactly 1", async () => {
    const { pkg, appointment } = await setupPackageWithAppointment(6, 4);

    const { error } = await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "completed",
    });
    expect(error).toBeNull();

    const { data: updatedPkg } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    expect(updatedPkg?.sessions_used).toBe(5);

    const { data: updatedAppt } = await db
      .from("appointments")
      .select("status, consumed_at")
      .eq("id", appointment.id)
      .single();
    expect(updatedAppt?.status).toBe("completed");
    expect(updatedAppt?.consumed_at).not.toBeNull();
  });

  it("cancelling a completed appointment restores sessions_used by exactly 1", async () => {
    const { pkg, appointment } = await setupPackageWithAppointment(6, 4);

    await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "completed",
    });

    const { error } = await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "cancelled",
    });
    expect(error).toBeNull();

    const { data: updatedPkg } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    expect(updatedPkg?.sessions_used).toBe(4);

    const { data: updatedAppt } = await db
      .from("appointments")
      .select("status, consumed_at")
      .eq("id", appointment.id)
      .single();
    expect(updatedAppt?.status).toBe("cancelled");
    expect(updatedAppt?.consumed_at).toBeNull();
  });

  it("marking an appointment no-show never touches sessions_used", async () => {
    const { pkg, appointment } = await setupPackageWithAppointment(6, 4);

    const { error } = await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "no_show",
    });
    expect(error).toBeNull();

    const { data: updatedPkg } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    expect(updatedPkg?.sessions_used).toBe(4);

    const { data: updatedAppt } = await db
      .from("appointments")
      .select("status, consumed_at")
      .eq("id", appointment.id)
      .single();
    expect(updatedAppt?.status).toBe("no_show");
    expect(updatedAppt?.consumed_at).toBeNull();
  });

  it("completing an already-completed appointment is a no-op (idempotent)", async () => {
    const { pkg, appointment } = await setupPackageWithAppointment(6, 4);

    await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "completed",
    });
    const { error } = await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "completed",
    });
    expect(error).toBeNull();

    const { data: updatedPkg } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    // Would be 6 if the trigger double-decremented; must stay at 5.
    expect(updatedPkg?.sessions_used).toBe(5);
  });

  it("rejects completion when the package is already exhausted", async () => {
    const { appointment } = await setupPackageWithAppointment(6, 6);

    const { error } = await db.rpc("set_appointment_status", {
      p_appointment_id: appointment.id,
      p_status: "completed",
    });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("exhausted");
  });

  it("concurrent completes on the same appointment serialize to a single decrement", async () => {
    const { pkg, appointment } = await setupPackageWithAppointment(6, 4);

    const [first, second] = await Promise.all([
      db.rpc("set_appointment_status", {
        p_appointment_id: appointment.id,
        p_status: "completed",
      }),
      db.rpc("set_appointment_status", {
        p_appointment_id: appointment.id,
        p_status: "completed",
      }),
    ]);

    expect(first.error).toBeNull();
    expect(second.error).toBeNull();

    const { data: updatedPkg } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    expect(updatedPkg?.sessions_used).toBe(5);
  });
});
