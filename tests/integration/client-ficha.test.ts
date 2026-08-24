import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedClientPackage,
  seedZone,
} from "./helpers/fixtures";
import { getClientPackages } from "@/features/clients/data/client-ficha";
import { summarizeClientPackages } from "@/features/clients/domain/client-packages";

describe.sequential("client ficha remaining sessions", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("matches the client_package_remaining view's remaining count", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Ana");
    await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 6,
      sessions_used: 2,
    });

    const packages = await getClientPackages(db, client.id);
    const summary = summarizeClientPackages(packages);

    const { data: viewRows, error } = await db
      .from("client_package_remaining")
      .select("remaining")
      .eq("client_id", client.id)
      .single();
    if (error) throw error;

    expect(summary).toHaveLength(1);
    expect(summary[0]?.remaining).toBe(4);
    expect(summary[0]?.remaining).toBe(viewRows?.remaining);
  });

  it("marks a fully-used package as completed, matching zero remaining in the view", async () => {
    const zone = await seedZone(db, "Axilas");
    const client = await seedClient(db, "Luz");
    await seedClientPackage(db, {
      client_id: client.id,
      zone_id: zone.id,
      total_sessions: 3,
      sessions_used: 3,
    });

    const packages = await getClientPackages(db, client.id);
    const summary = summarizeClientPackages(packages);

    const { data: viewRows, error } = await db
      .from("client_package_remaining")
      .select("remaining")
      .eq("client_id", client.id)
      .single();
    if (error) throw error;

    expect(summary[0]?.status).toBe("completed");
    expect(summary[0]?.remaining).toBe(0);
    expect(viewRows?.remaining).toBe(0);
  });
});
