import { createClient } from "@supabase/supabase-js";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedStaffMember } from "../helpers/fixtures";

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

const db = createServiceRoleClient();
const today = () => new Date().toISOString().slice(0, 10);

describe.sequential("RLS: cash tables are staff-only", () => {
  let staffId: string;
  let cleanup: () => Promise<void>;
  let sessionId: string;

  beforeEach(async () => {
    await resetDatabase(db);
    const staff = await seedStaffMember(db);
    staffId = staff.id;
    cleanup = staff.cleanup;
    const { data } = await db
      .from("cash_sessions")
      .insert({ business_date: today(), opening_amount: 1000, opened_by: staffId })
      .select("id")
      .single();
    sessionId = data!.id;
    await db.from("cash_movements").insert({
      session_id: sessionId,
      kind: "ingreso",
      direction: "in",
      amount: 100,
      reason: "seed",
      created_by: staffId,
    });
  });

  afterEach(async () => {
    await resetDatabase(db);
    await cleanup();
  });

  afterAll(async () => {
    await resetDatabase(db);
  });

  it("returns zero rows and rejects writes for an authenticated non-staff user", async () => {
    const email = `no-staff-${crypto.randomUUID()}@example.com`;
    const password = "correct horse battery staple 1!";
    const { data: created, error: createError } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const anon = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY);
    const { data: session } = await anon.auth.signInWithPassword({ email, password });

    const asStranger = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${session.session!.access_token}` },
      },
    });

    const sessions = await asStranger.from("cash_sessions").select("*");
    expect(sessions.error).toBeNull();
    expect(sessions.data).toEqual([]);

    const movements = await asStranger.from("cash_movements").select("*");
    expect(movements.error).toBeNull();
    expect(movements.data).toEqual([]);

    const write = await asStranger
      .from("cash_sessions")
      .insert({ business_date: "2020-01-01", opening_amount: 1, opened_by: staffId });
    expect(write.error).not.toBeNull();

    await db.auth.admin.deleteUser(created.user!.id);
  });

  it("lets a staff JWT read the cash rows", async () => {
    const staff = await seedStaffMember(db);
    const anon = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY);
    const { data: session } = await anon.auth.signInWithPassword({
      email: staff.email,
      password: "correct horse battery staple 1!",
    });
    const asStaff = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${session.session!.access_token}` },
      },
    });

    const { data: rows, error } = await asStaff.from("cash_sessions").select("id");
    expect(error).toBeNull();
    expect(rows?.length).toBe(1);

    await staff.cleanup();
  });
});
