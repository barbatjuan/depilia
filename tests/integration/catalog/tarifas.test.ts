import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedClientPackage,
  seedZone,
} from "../helpers/fixtures";
import {
  archiveTariff,
  createTariff,
  listTariffs,
  restoreTariff,
  updateTariff,
} from "@/features/settings/data/tarifas";
import { listActivePackageTemplates } from "@/features/packages/data/package-templates";

const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

const base = {
  zoneName: "Pómulos",
  gender: "mujer" as const,
  sizeCategory: "mini" as const,
  sessionPrice: 6,
  bonoPrice: 30,
  defaultSessions: 6,
};

describe.sequential("tarifas ABM data layer", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceRoleClient() as any;

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await resetDatabase(db);
  });

  it("createTariff for a new zone name creates both the body_zones and package_templates rows", async () => {
    const row = await createTariff(db, base);

    expect(row).toMatchObject({
      name: "Pómulos",
      zoneName: "Pómulos",
      gender: "mujer",
      sizeCategory: "mini",
      defaultSessions: 6,
      sessionPrice: 6,
      bonoPrice: 30,
      active: true,
    });

    const { data: zone } = await db
      .from("body_zones")
      .select("id, name")
      .eq("name", "Pómulos")
      .single();
    expect(zone?.name).toBe("Pómulos");
    expect(row.zoneId).toBe(zone!.id);
  });

  it("reuses an existing zone (case-insensitive) instead of duplicating it", async () => {
    await seedZone(db, "Axilas");
    const row = await createTariff(db, { ...base, zoneName: "axilas" });

    const { data: zones } = await db
      .from("body_zones")
      .select("id")
      .ilike("name", "axilas");
    expect(zones).toHaveLength(1);
    expect(row.zoneId).toBe(zones![0].id);
  });

  it("rejects a second active tariff for the same (zone, gender) with 23505", async () => {
    await createTariff(db, base);
    await expect(createTariff(db, { ...base, sessionPrice: 7 })).rejects.toMatchObject(
      { code: "23505" },
    );

    // The other gender on the same zone is allowed.
    const otherGender = await createTariff(db, { ...base, gender: "hombre" });
    expect(otherGender.gender).toBe("hombre");
  });

  it("archiveTariff sets active=false, keeps the row, and drops it from the sell picker", async () => {
    const row = await createTariff(db, base);
    await archiveTariff(db, row.id);

    const active = await listTariffs(db, { gender: "mujer" });
    expect(active).toHaveLength(0);

    const all = await listTariffs(db, { gender: "mujer", includeArchived: true });
    expect(all.map((t) => t.id)).toEqual([row.id]);
    expect(all[0]!.active).toBe(false);

    const picker = await listActivePackageTemplates(db);
    expect(picker.find((t) => t.id === row.id)).toBeUndefined();
  });

  it("updateTariff changes size + prices only", async () => {
    const row = await createTariff(db, base);
    const updated = await updateTariff(db, row.id, {
      sizeCategory: "grande",
      sessionPrice: 40,
      bonoPrice: 210,
    });
    expect(updated).toMatchObject({
      sizeCategory: "grande",
      sessionPrice: 40,
      bonoPrice: 210,
      gender: "mujer",
    });
  });

  it("restoreTariff is rejected with 23505 when a conflicting active tariff now exists", async () => {
    const first = await createTariff(db, base);
    await archiveTariff(db, first.id);
    await createTariff(db, { ...base, sessionPrice: 8 });

    await expect(restoreTariff(db, first.id)).rejects.toMatchObject({
      code: "23505",
    });
  });

  it("deleting a template detaches client_packages history (template_id -> NULL)", async () => {
    const row = await createTariff(db, base);
    const client = await seedClient(db, "Ana");
    const pkg = await seedClientPackage(db, {
      client_id: client.id,
      zone_id: row.zoneId,
      total_sessions: 6,
    });
    await db.from("client_packages").update({ template_id: row.id }).eq("id", pkg.id);

    const { error } = await db.from("package_templates").delete().eq("id", row.id);
    expect(error).toBeNull();

    const { data: survivor } = await db
      .from("client_packages")
      .select("id, template_id, total_sessions")
      .eq("id", pkg.id)
      .single();
    expect(survivor).toEqual({
      id: pkg.id,
      template_id: null,
      total_sessions: 6,
    });
  });

  it("denies a non-staff JWT from reading or writing package_templates", async () => {
    await createTariff(db, base);

    const email = `no-staff-${crypto.randomUUID()}@example.com`;
    const password = "correct horse battery staple 1!";
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const anon = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY);
    const { data: session, error: signInError } =
      await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    const stranger = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${session.session!.access_token}` },
      },
    });

    const read = await stranger.from("package_templates").select("*");
    expect(read.data).toEqual([]);

    const write = await stranger
      .from("package_templates")
      .update({ session_price: 999 })
      .eq("name", "Pómulos")
      .select();
    expect(write.data).toEqual([]);

    await db.auth.admin.deleteUser(created.user!.id);
  });
});
