# Depilia

Single-clinic laser hair removal management app (Next.js App Router + Supabase).

## Stack

- Next.js 15 (App Router, TypeScript), Tailwind v4, shadcn/ui + Radix
- Supabase (Postgres, Auth, RLS) — money and session invariants enforced in SQL, not TS
- Vitest (`unit` + `integration` projects), Playwright for e2e
- pnpm

## First-run local setup

```bash
pnpm install
npx supabase start          # requires Docker running; applies supabase/migrations
cp env.sample.txt .env.local
# fill NEXT_PUBLIC_SUPABASE_URL / ANON_KEY / SERVICE_ROLE_KEY from `supabase start` output
```

Create the first admin staff row against the local Auth user you'll log in with:

```sql
insert into staff (user_id, full_name)
values ('<auth.users.id of your local dev user>', 'Admin');
```

## Commands

| Command | What |
|---|---|
| `pnpm dev` | Run the app locally |
| `pnpm test` | Vitest — unit + integration projects |
| `pnpm test:unit` | Unit project only (no DB required) |
| `pnpm test:integration` | Integration project only (requires `supabase start`) |
| `pnpm e2e` | Playwright e2e |
| `pnpm verify` | lint + typecheck + vitest + playwright |

Integration tests hit a real local Postgres — locks, triggers, and constraints are
never mocked. If Docker/`supabase start` is unavailable, `pnpm test:integration` fails
loudly rather than skipping silently.
