import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedDiscountCode,
  seedPromotion,
} from "../helpers/fixtures";

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";

const NEW_TABLES = [
  "promotions",
  "promotion_items",
  "discount_codes",
  "sale_packages",
] as const;

describe.sequential("0015 promotions — RLS is staff-only on the new tables", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
    await seedPromotion(db, { kind: "combo" });
    await seedDiscountCode(db, { code: "RLSCODE" });
  });

  afterEach(async () => {
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

    for (const table of NEW_TABLES) {
      const read = await asStranger.from(table).select("*");
      expect(read.error).toBeNull();
      expect(read.data).toEqual([]);
    }

    const write = await asStranger
      .from("promotions")
      .insert({ name: "Hack", kind: "combo" });
    expect(write.error).not.toBeNull();

    const codeWrite = await asStranger
      .from("discount_codes")
      .insert({ code: "HACK", kind: "percent", value: 5 });
    expect(codeWrite.error).not.toBeNull();

    await db.auth.admin.deleteUser(created.user!.id);
  });
});
