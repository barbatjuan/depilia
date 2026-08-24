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
| `pnpm e2e:reset` | Reset the local Supabase stack (`supabase db reset`) before an e2e run |
| `pnpm verify` | lint + typecheck + vitest + playwright |

Integration tests hit a real local Postgres — locks, triggers, and constraints are
never mocked. If Docker/`supabase start` is unavailable, `pnpm test:integration` fails
loudly rather than skipping silently.

## E2E (`pnpm e2e`)

`e2e/golden-path.spec.ts` drives the full MVP flow through the real UI against the
local Supabase stack: login → create a client → sell a package → book an
appointment against it → complete the appointment → verify the package's
remaining-sessions count decremented by exactly 1 → register a payment → verify
the balance owed → create an expense → verify the dashboard KPIs.

A Playwright `globalSetup` (`e2e/global-setup.ts`) seeds the two fixtures no UI
screen in this MVP can create — the local admin auth user + `staff` row the
suite logs in as, and one active `package_templates` catalog row — using the
Supabase service-role admin API, idempotently. Requires `npx supabase start`
running. `pnpm e2e:reset` (`supabase db reset`) gives a clean slate first if
you want one; it is optional, not required, since global setup is idempotent.
