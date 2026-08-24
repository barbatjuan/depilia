import type { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * The concrete client type returned by `createServerClient<Database>` /
 * `createBrowserClient<Database>`. Feature data layers depend on this
 * instead of a hand-annotated `SupabaseClient<Database>` because
 * `@supabase/ssr`'s bundled generic shape and the installed
 * `@supabase/supabase-js` version's `SupabaseClient` generic arity can
 * drift out of structural sync across independent version bumps —
 * inferring from the real factory call keeps the two always in lockstep.
 */
export type AppSupabaseClient = ReturnType<typeof createServerClient<Database>>;
