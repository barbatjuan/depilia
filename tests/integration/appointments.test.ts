import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import {
  resetDatabase,
  seedAppointment,
  seedClient,
  seedClientPackage,
  seedLooseSale,
  seedZone,
} from "./helpers/fixtures";
import {
  createAppointment,
  listAppointmentsInRange,
  rescheduleAppointment,
  setAppointmentStatus,
} from "@/features/appointments/data/appointments";

describe.sequential("appointments data layer", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("creates an appointment and it appears in the range list (spec: book appointment)", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");

    const created = await createAppointment(db, {
      clientId: client.id,
      zoneId: zone.id,
      scheduledAt: "2026-08-24T13:00:00.000Z",
      durationMinutes: 30,
      notes: "",
      clientPackageId: "",
      looseSaleId: "",
    });

    const list = await listAppointmentsInRange(db, {
      start: new Date("2026-08-24T00:00:00.000Z"),
      end: new Date("2026-08-25T00:00:00.000Z"),
    });

    expect(list.map((a) => a.id)).toContain(created.id);
    expect(created.status).toBe("scheduled");
  });

  it("links an appointment to an unclaimed loose sale (task: tied to a loose sales row)", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const sale = await seedLooseSale(db, { client_id: client.id });

    const created = await createAppointment(db, {
      clientId: client.id,
      zoneId: zone.id,
      scheduledAt: "2026-08-24T13:00:00.000Z",
      durationMinutes: 30,
      notes: "",
      clientPackageId: "",
      looseSaleId: sale.id,
    });

    const { data: saleRow, error } = await db
      .from("sales")
      .select("appointment_id")
      .eq("id", sale.id)
      .single();
    if (error) throw error;

    expect(saleRow.appointment_id).toBe(created.id);
  });

  it("rejects an overlapping appointment with a friendly Spanish message, not a raw Postgres error", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
      duration_minutes: 30,
    });

    await expect(
      createAppointment(db, {
        clientId: client.id,
        zoneId: zone.id,
        scheduledAt: "2026-08-24T13:15:00.000Z", // overlaps the first appointment
        durationMinutes: 30,
        notes: "",
        clientPackageId: "",
        looseSaleId: "",
      }),
    ).rejects.toThrow(
      "Ese horario se superpone con otro turno ya agendado. Elegí otro horario.",
    );
  });

  it("rejects rescheduling into an overlap with the same friendly message", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
      duration_minutes: 30,
    });
    const movable = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: "2026-08-24T16:00:00.000Z",
      duration_minutes: 30,
    });

    await expect(
      rescheduleAppointment(db, movable.id, {
        scheduledAt: "2026-08-24T13:10:00.000Z",
        durationMinutes: 30,
      }),
    ).rejects.toThrow(
      "Ese horario se superpone con otro turno ya agendado. Elegí otro horario.",
    );
  });

  it("allows rescheduling into a free slot", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const appt = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
      duration_minutes: 30,
    });

    const rescheduled = await rescheduleAppointment(db, appt.id, {
      scheduledAt: "2026-08-24T17:00:00.000Z",
      durationMinutes: 45,
    });

    expect(rescheduled.scheduledAt).toBe("2026-08-24T17:00:00+00:00");
    expect(rescheduled.durationMinutes).toBe(45);
  });

  it("marking complete decrements sessions_used via the ledger trigger (spec: session decrement)", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 6,
      sessions_used: 2,
    });
    const appt = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      client_package_id: pkg.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
    });

    const result = await setAppointmentStatus(db, appt.id, "completed");
    expect(result.status).toBe("completed");
    expect(result.consumedAt).not.toBeNull();

    const { data: pkgRow, error } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    if (error) throw error;
    expect(pkgRow.sessions_used).toBe(3);
  });

  it("cancelling a completed appointment restores the session (spec: cancel-after-completion restores)", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 6,
      sessions_used: 2,
    });
    const appt = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      client_package_id: pkg.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
    });

    await setAppointmentStatus(db, appt.id, "completed");
    const cancelled = await setAppointmentStatus(db, appt.id, "cancelled");
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.consumedAt).toBeNull();

    const { data: pkgRow, error } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    if (error) throw error;
    expect(pkgRow.sessions_used).toBe(2);
  });

  it("marking no_show does not touch sessions_used (spec: no-show does not consume)", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 6,
      sessions_used: 2,
    });
    const appt = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      client_package_id: pkg.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
    });

    const result = await setAppointmentStatus(db, appt.id, "no_show");
    expect(result.status).toBe("no_show");
    expect(result.consumedAt).toBeNull();

    const { data: pkgRow, error } = await db
      .from("client_packages")
      .select("sessions_used")
      .eq("id", pkg.id)
      .single();
    if (error) throw error;
    expect(pkgRow.sessions_used).toBe(2);
  });

  it("marking complete on an exhausted package surfaces a friendly Spanish message", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Nora");
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 2,
      sessions_used: 2,
    });
    const appt = await seedAppointment(db, {
      client_id: client.id,
      zone_id: zone.id,
      client_package_id: pkg.id,
      scheduled_at: "2026-08-24T13:00:00.000Z",
    });

    await expect(
      setAppointmentStatus(db, appt.id, "completed"),
    ).rejects.toThrow("Este paquete no tiene sesiones disponibles.");
  });
});
