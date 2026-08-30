import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedZone } from "../helpers/fixtures";
import { withPgClient } from "../helpers/pg";

const MIGRATION_0012 = readFileSync(
  join(process.cwd(), "supabase/migrations/0012_service_catalog.sql"),
  "utf8",
);

/**
 * Reverts the `package_templates` shape to its pre-0012 form INSIDE an open
 * transaction, so a spec can seed a legacy row and replay the real migration
 * file against it, then `ROLLBACK`. Keeps these assertions bound to the
 * actual migration text rather than a transcription of it.
 */
const REVERT_0012 = `
  drop index if exists package_templates_zone_gender_active_idx;
  alter table package_templates drop constraint if exists package_templates_bono_price_check;
  alter table package_templates drop constraint if exists package_templates_session_price_check;
  alter table package_templates drop constraint if exists package_templates_gender_check;
  alter table package_templates drop constraint if exists package_templates_size_category_check;
  alter table package_templates alter column gender drop not null;
  alter table package_templates alter column size_category drop not null;
  alter table package_templates alter column session_price drop not null;
  alter table package_templates rename column bono_price to price;
  alter table package_templates
    drop column gender, drop column size_category, drop column session_price;
  alter table package_templates
    add constraint package_templates_price_check check (price >= 0);
  alter table package_templates alter column default_sessions drop default;
  update body_zones set archived = false
    where name in ('underarms', 'legs', 'bikini', 'face', 'back');
`;

const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

describe.sequential("migration 0012: service catalog schema", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await resetDatabase(db);
  });

  it("Preflight rejects non-positive price (raises before any DDL)", async () => {
    await withPgClient(async (client) => {
      await client.query("begin");
      try {
        await client.query(REVERT_0012);
        await client.query(
          `insert into body_zones (name) values ('Preflight Zone')`,
        );
        await client.query(
          `insert into package_templates (zone_id, name, default_sessions, price)
           select id, 'Legacy zero', 6, 0 from body_zones where name = 'Preflight Zone'`,
        );

        await expect(client.query(MIGRATION_0012)).rejects.toThrow(
          /price <= 0/i,
        );
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("Backfill values (legacy price 30000 -> bono_price 30000, mujer, mediana, session_price 5000.00)", async () => {
    await withPgClient(async (client) => {
      await client.query("begin");
      try {
        await client.query(REVERT_0012);
        await client.query(
          `insert into body_zones (name) values ('Backfill Zone')`,
        );
        await client.query(
          `insert into package_templates (zone_id, name, default_sessions, price)
           select id, 'Legacy 30k', 6, 30000 from body_zones where name = 'Backfill Zone'`,
        );

        await client.query(MIGRATION_0012);

        const { rows } = await client.query(
          `select bono_price, gender, size_category, session_price
           from package_templates where name = 'Legacy 30k'`,
        );
        expect(rows[0]).toEqual({
          bono_price: "30000.00",
          gender: "mujer",
          size_category: "mediana",
          session_price: "5000.00",
        });
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("English demo retirement archives the 5 seed zones", async () => {
    await withPgClient(async (client) => {
      await client.query("begin");
      try {
        await client.query(REVERT_0012);
        await client.query(
          `insert into body_zones (name) values
             ('underarms'), ('legs'), ('bikini'), ('face'), ('back')
           on conflict (name) do nothing`,
        );

        await client.query(MIGRATION_0012);

        const { rows } = await client.query(
          `select count(*)::int as archived from body_zones
           where name in ('underarms', 'legs', 'bikini', 'face', 'back')
             and archived`,
        );
        expect(rows[0].archived).toBe(5);
      } finally {
        await client.query("rollback");
      }
    });
  });

  it("Enum and positive-price checks reject bad rows", async () => {
    const zone = await seedZone(db, "Check Zone");

    const base: Record<string, unknown> = {
      zone_id: zone.id,
      name: "Check tpl",
      default_sessions: 6,
      session_price: 10,
      bono_price: 48,
      gender: "mujer",
      size_category: "pequena",
    };

    const bad: Record<string, unknown>[] = [
      { ...base, gender: "unisex" },
      { ...base, size_category: "enorme" },
      { ...base, bono_price: 0 },
      { ...base, session_price: 0 },
    ];

    for (const row of bad) {
      const { error } = await db
        .from("package_templates")
        .insert(row as never);
      expect(error).not.toBeNull();
    }

    const { error: okError } = await db
      .from("package_templates")
      .insert(base as never);
    expect(okError).toBeNull();
  });

  it("NOT NULL post-backfill on gender / size_category / session_price", async () => {
    await withPgClient(async (client) => {
      const { rows } = await client.query(
        `select column_name, is_nullable from information_schema.columns
         where table_name = 'package_templates'
           and column_name in ('gender', 'size_category', 'session_price', 'bono_price')
         order by column_name`,
      );
      expect(rows).toEqual([
        { column_name: "bono_price", is_nullable: "NO" },
        { column_name: "gender", is_nullable: "NO" },
        { column_name: "session_price", is_nullable: "NO" },
        { column_name: "size_category", is_nullable: "NO" },
      ]);
    });
  });

  it("Partial unique index (zone_id, gender) where active", async () => {
    const zone = await seedZone(db, "Unique Zone");
    const tpl = (over: Record<string, unknown>) =>
      ({
        zone_id: zone.id,
        name: "U",
        default_sessions: 6,
        session_price: 10,
        bono_price: 48,
        gender: "mujer",
        size_category: "pequena",
        ...over,
      }) as never;

    const first = await db.from("package_templates").insert(tpl({}));
    expect(first.error).toBeNull();

    const dupeActive = await db
      .from("package_templates")
      .insert(tpl({ name: "U2" }));
    expect(dupeActive.error?.code).toBe("23505");

    const archivedThenActive = await db
      .from("package_templates")
      .insert(tpl({ name: "U3", active: false }));
    expect(archivedThenActive.error).toBeNull();

    const otherGender = await db
      .from("package_templates")
      .insert(tpl({ name: "U4", gender: "hombre" }));
    expect(otherGender.error).toBeNull();
  });

  it("Staff-only catalog access denies a non-staff JWT", async () => {
    await seedZone(db, "RLS Zone");

    const email = `no-staff-${crypto.randomUUID()}@example.com`;
    const password = "correct horse battery staple 1!";
    const { data: created, error: createError } =
      await db.auth.admin.createUser({ email, password, email_confirm: true });
    if (createError) throw createError;

    const anon = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY);
    const { data: session, error: signInError } =
      await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;

    const stranger = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      global: {
        headers: {
          Authorization: `Bearer ${session.session!.access_token}`,
        },
      },
    });

    const zones = await stranger.from("body_zones").select("*");
    const templates = await stranger.from("package_templates").select("*");
    expect(zones.data).toEqual([]);
    expect(templates.data).toEqual([]);

    await db.auth.admin.deleteUser(created.user!.id);
  });
});
