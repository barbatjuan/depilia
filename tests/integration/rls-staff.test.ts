import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Database } from "@/lib/supabase/types";
import { createServiceRoleClient } from "./helpers/supabase";
import { resetDatabase, seedClient } from "./helpers/fixtures";

const LOCAL_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const LOCAL_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlLWRlbW8iLCJpYXQiOjE2NDE3NjkyMDAsImV4cCI6MTc5OTUzNTYwMH0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE";

describe.sequential("RLS: non-staff JWT is denied on every table", () => {
  const service = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(service);
  });

  afterEach(async () => {
    await resetDatabase(service);
  });

  it("denies a client-table select to an authenticated user with no staff row", async () => {
    await seedClient(service, "Seeded By Service Role");

    // A real Supabase Auth user, but deliberately with NO matching `staff` row.
    const email = `no-staff-${crypto.randomUUID()}@example.com`;
    const password = "correct horse battery staple 1!";
    const { data: created, error: createError } =
      await service.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
    if (createError) throw createError;

    const anon = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY);
    const { data: session, error: signInError } =
      await anon.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
    expect(session.session).not.toBeNull();

    const asStranger = createClient<Database>(LOCAL_URL, LOCAL_ANON_KEY, {
      global: {
        headers: { Authorization: `Bearer ${session.session!.access_token}` },
      },
    });

    const { data: rows, error } = await asStranger.from("clients").select("*");

    expect(error).toBeNull();
    expect(rows).toEqual([]);

    await service.auth.admin.deleteUser(created.user!.id);
  });
});
