import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import { resetDatabase, seedClient, seedZone } from "./helpers/fixtures";

describe.sequential("single-chair overlap EXCLUDE constraint on appointments", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("rejects a second scheduled appointment overlapping an existing one", async () => {
    const zone = await seedZone(db, "legs");
    const client = await seedClient(db);
    const start = new Date("2026-09-01T15:00:00-03:00");

    const { error: firstError } = await db.from("appointments").insert({
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: start.toISOString(),
      duration_minutes: 30,
    });
    expect(firstError).toBeNull();

    const overlappingStart = new Date(start.getTime() + 15 * 60 * 1000);
    const { error: secondError } = await db.from("appointments").insert({
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: overlappingStart.toISOString(),
      duration_minutes: 30,
    });

    expect(secondError).not.toBeNull();
  });

  it("allows a back-to-back appointment that starts exactly when the previous ends", async () => {
    const zone = await seedZone(db, "legs");
    const client = await seedClient(db);
    const start = new Date("2026-09-01T16:00:00-03:00");

    await db.from("appointments").insert({
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: start.toISOString(),
      duration_minutes: 30,
    });

    const backToBackStart = new Date(start.getTime() + 30 * 60 * 1000);
    const { error } = await db.from("appointments").insert({
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: backToBackStart.toISOString(),
      duration_minutes: 30,
    });

    expect(error).toBeNull();
  });

  it("allows overlapping times once the earlier appointment is cancelled", async () => {
    const zone = await seedZone(db, "legs");
    const client = await seedClient(db);
    const start = new Date("2026-09-01T17:00:00-03:00");

    const { data: firstAppt, error: firstError } = await db
      .from("appointments")
      .insert({
        client_id: client.id,
        zone_id: zone.id,
        scheduled_at: start.toISOString(),
        duration_minutes: 30,
      })
      .select()
      .single();
    if (firstError) throw firstError;

    await db.rpc("set_appointment_status", {
      p_appointment_id: firstAppt.id,
      p_status: "cancelled",
    });

    const { error } = await db.from("appointments").insert({
      client_id: client.id,
      zone_id: zone.id,
      scheduled_at: start.toISOString(),
      duration_minutes: 30,
    });

    expect(error).toBeNull();
  });
});
