import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { LoginInput } from "@/features/auth/schema";

/**
 * Thin data-layer wrapper around Supabase Auth password sign-in. Takes an
 * injected client so it can be exercised in tests without a live server
 * context. No RLS is involved here — auth.users lives outside `public`.
 */
export async function signInWithPassword(
  supabase: AppSupabaseClient,
  credentials: LoginInput,
) {
  return supabase.auth.signInWithPassword(credentials);
}
