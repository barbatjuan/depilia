import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase } from "../helpers/fixtures";

const LOCAL_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

describe.sequential("migration 0014: clinic currency + locale", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterAll(async () => {
    await resetDatabase(db);
  });

  it("currency defaults to 'EUR' and locale to 'es-ES'", async () => {
    const { error } = await db.from("clinic_settings").insert({ id: true });
    expect(error).toBeNull();

    const { data } = await db
      .from("clinic_settings")
      .select("currency, locale")
      .single();
    expect(data).toEqual({ currency: "EUR", locale: "es-ES" });
  });

  it("persists a currency + locale update without touching stored amounts", async () => {
    await db.from("clinic_settings").insert({ id: true });
    await db.from("clients").insert({ first_name: "A", last_name: "B" });
    const { data: client } = await db.from("clients").select("id").single();
    const { data: sale } = await db
      .from("sales")
      .insert({ client_id: client!.id, description: "x", total: 120 })
      .select("id, total")
      .single();

    const { error } = await db
      .from("clinic_settings")
      .update({ currency: "USD", locale: "en-US" })
      .eq("id", true);
    expect(error).toBeNull();

    const { data: settings } = await db
      .from("clinic_settings")
      .select("currency, locale")
      .single();
    expect(settings).toEqual({ currency: "USD", locale: "en-US" });

    const { data: afterSale } = await db
      .from("sales")
      .select("total")
      .eq("id", sale!.id)
      .single();
    expect(afterSale!.total).toBe(120);
  });

  it("rejects a non-3-letter-uppercase currency code", async () => {
    const { error } = await db
      .from("clinic_settings")
      .insert({ id: true, currency: "eur" });
    expect(error?.code).toBe("23514");
  });

  it("denies a non-staff JWT read/write on clinic_settings", async () => {
    await db.from("clinic_settings").insert({ id: true });

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

    const read = await stranger.from("clinic_settings").select("*");
    expect(read.data).toEqual([]);

    // RLS filters the row out of the UPDATE's scope: no error, but nothing is
    // returned and nothing changes.
    const write = await stranger
      .from("clinic_settings")
      .update({ currency: "USD" })
      .eq("id", true)
      .select();
    expect(write.data).toEqual([]);

    const { data: unchanged } = await db
      .from("clinic_settings")
      .select("currency")
      .single();
    expect(unchanged!.currency).toBe("EUR");

    await db.auth.admin.deleteUser(created.user!.id);
  });
});
