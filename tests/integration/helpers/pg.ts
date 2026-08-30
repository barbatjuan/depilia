import { Client } from "pg";

/**
 * Raw Postgres access for the few integration specs that must assert
 * migration-time behaviour (preflight `do $$` guards, in-place backfills)
 * which PostgREST / supabase-js cannot reach. `supabase start` always
 * exposes the local database on this fixed URL.
 */
export const LOCAL_PG_URL =
  process.env.SUPABASE_DB_URL ??
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export async function withPgClient<T>(
  fn: (client: Client) => Promise<T>,
): Promise<T> {
  const client = new Client({ connectionString: LOCAL_PG_URL });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}
