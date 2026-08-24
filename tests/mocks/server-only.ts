// Vitest stub for the `server-only` package.
//
// `server-only` throws when imported from a "Client Component" bundle —
// a Next.js build-time distinction Vitest doesn't understand, so without
// this alias any test that transitively imports `src/lib/supabase/admin.ts`
// (e.g. the cron reminder route) fails with
// "This module cannot be imported from a Client Component module."
// This stub makes the import a no-op in tests; the real guard still
// applies during `next build`.
export {};
