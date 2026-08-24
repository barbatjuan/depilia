import { config } from "dotenv";

// Integration tests need the local Supabase stack's URL/keys.
// `supabase start` writes these; load .env.local if present, otherwise
// tests/integration/helpers/supabase.ts falls back to the documented
// local defaults.
config({ path: ".env.local" });
