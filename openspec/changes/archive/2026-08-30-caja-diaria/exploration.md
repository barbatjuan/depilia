# Exploration: caja-diaria — daily cash register over the sales area

> Mirror of Engram observation `sdd/caja-diaria/explore` (#113). Artifact store: hybrid.

## Current State

### Money model today
- `sales` (0006): `client_id`, optional `client_package_id` XOR `appointment_id`, `description`, `total > 0`, `sold_at`, `status in ('open','void')`. No cash concept.
- `payments` (0006): `sale_id` (FK `on delete restrict`), `amount > 0`, `paid_at timestamptz default now()`, `method in ('cash','card','transfer','other')`, `note`. A `BEFORE INSERT` trigger `payments_reject_overpayment` locks the sale `FOR UPDATE` and rejects when `sum(amount) + NEW.amount > total`.
- `expenses` (0007): `category_id` (FK `on delete restrict`), `amount > 0`, `spent_on date` (plain date, no time), `description`. **No `method`/payment-method column. No link to any cash session.**
- `expense_categories` (0003): `name`, `archived` bool; app archives instead of deleting.
- Views (0009): `sale_balances(sale_id,total,paid,balance)` = `total - sum(payments)`; `client_package_remaining`. Simple views inherit RLS from base tables (security_invoker, PG15+).
- No table represents cash on hand, an opening float, an arqueo, or a non-sale cash movement.

### Feature-sliced layout (design decisions 1-9)
- `src/app/(dashboard)/<section>/page.tsx` = routing only; RSC calls a `data/` fn with injected `AppSupabaseClient`.
- Each slice: `domain/*.ts` (pure, Vitest, no I/O), `data/*.ts` (queries), `actions/*.ts` (`'use server'` -> zod re-parse -> data -> `revalidatePath`), `schema.ts` (zod shared form+action), `components/*.tsx`.
- `sales` slice: `domain/sale-balance.ts` (`deriveSaleBalance` mirrors the SQL view), `domain/payment-errors.ts` (PG error -> Spanish), `data/sales.ts` (`listSales`,`getSale`), `data/payments.ts` (`registerPayment` thin insert, trigger enforces ceiling), `actions/register-payment.ts`, `schema.ts` (`registerPaymentSchema`).
- `expenses` slice: `data/expenses.ts` (list/get/create/update/delete — plain deletes, no session link), `domain/month-total.ts` (`currentMonthRange`/`currentMonthTotal`, own private `CLINIC_TZ`), category CRUD with RESTRICT-mapped delete errors.
- `/ventas` (`src/app/(dashboard)/ventas/page.tsx`): sales ledger table (`SaleTable`), optional `?clientId=` filter, links to `/ventas/[id]` detail with payment history + "registrar pago" form.
- Nav: `src/components/nav-items.ts` — `NAV_ITEMS` (Dashboard, Agenda, Clientes, Ventas, Gastos, Configuración) + `isNavItemActive` (exact or nested).

### Timezone
- `src/features/dashboard/domain/schedule.ts`: `CLINIC_TZ = "America/Argentina/Buenos_Aires"`, `getClinicDayBounds(now)` -> `{start,end}` UTC instants for the BA calendar day (hard-codes UTC-3, "BA has no DST"). Also `getClinicWeekBounds`. Constant is re-declared privately in >=3 other slices — no shared module.
- `clinic_settings.timezone` column exists (default BA) but nothing reads it.

### Invariant enforcement pattern (design decisions 2-5)
- Money/session invariants in Postgres: CHECK + one `BEFORE` trigger taking `FOR UPDATE` locks; thin `SECURITY INVOKER` RPC (`set_appointment_status`) is the single mutation entry point.
- Derived values are **views**, never stored columns.
- RLS: every table `enable row level security` + one policy `for all to authenticated using (public.is_staff()) with check (public.is_staff())`. `is_staff()` is `SECURITY DEFINER`, fixed `search_path`. FK note: `staff.id` is the slice PK; `staff.user_id -> auth.users`.

### Tests
- Unit: pure domain (Vitest node). Integration: real local Postgres (`supabase start`), `describe.sequential`, truncate between specs. E2E: Playwright golden path (`login -> sell -> book -> complete -> pay`).
- `test_command` = `pnpm test`. Strict TDD: failing test first.
- `scripts/seed-demo.mjs` is the dev seed; needs caja rows later.

## Feasibility
Feasible and well-aligned. Classic open/close register maps cleanly onto "invariants in Postgres, derived values in views, thin slice on top". No infra change. Main tension: strictness of `payments`/`expenses` <-> cash-session coupling (hard FK + guard trigger vs. soft time-window). Everything else additive.

## Domain Model Shape (tradeoffs, NOT decisions)

### A. `cash_sessions` (needed in every option)
```
cash_sessions(id uuid pk,
  business_date date not null unique,        -- BA calendar day; UNIQUE = one/day
  opened_at timestamptz not null default now(), opened_by uuid not null references staff(id),
  opening_amount numeric(12,2) not null check (>= 0),   -- "monto inicial"
  closed_at timestamptz, closed_by uuid references staff(id),
  counted_amount numeric(12,2) check (>= 0),            -- arqueo physical count
  closing_note text,
  status text not null default 'open' check (status in ('open','closed')))
```
- One-session-per-day: `UNIQUE(business_date)` simplest; a void/reopen then needs a status flag or partial unique index.
- Reopen: `status='reopened'` vs. flip back to `open` + null arqueo vs. append-only `cash_session_events` audit.
- Difference: store `counted_amount` only + derive `difference` in view vs. snapshot `theoretical_amount`+`difference` at close. Theoretical depends on payment/expense rows that can later be edited/voided. **Leaning: snapshot at close, derive only while open.**

### B. `cash_movements` (retiro / adelanto / pago proveedor efectivo)
```
cash_movements(id uuid pk, session_id uuid not null references cash_sessions(id) on delete restrict,
  kind text not null check (kind in ('deposit','withdrawal','adjustment', ...)),
  amount numeric(12,2) not null check (amount > 0),   -- sign derived from kind
  reason text not null, created_at timestamptz not null default now(),
  created_by uuid not null references staff(id))
```
- Signed `amount` vs. `kind`-derived sign: kind-derived keeps CHECK simple.
- If `expenses.method='cash'` feeds the balance, `cash_movements` covers only non-expense outflows (retiro, adelanto) — else double-count.
- Fixed `kind` enum vs. reuse `expense_categories`: fixed enum is more classic.

### C. Expense payment method (the verified gap)
| Option | Change | Pros | Cons |
|---|---|---|---|
| C1. `expenses.method text check in ('cash','card','transfer','other') default 'cash'` | 1 ALTER + schema/form/action | mirrors `payments.method`; explicit | every expense form gets a field; backfill assumption |
| C2. `expenses.method` but only `('cash','other')` | same, smaller enum | simpler UI; matches "cash only" scope | loses parity with `payments` |
| C3. every expense is cash (no column) | none | zero migration | wrong the moment a supplier is paid by transfer |
| C4. `expenses.session_id` nullable FK, only linked expenses count | 1 ALTER + UI picker | bookkeeper controls exactly what hits the drawer | manual, error-prone |

### D. Theoretical balance
```
theoretical_cash = opening_amount
  + sum(payments.amount where method='cash' and paid_at in [session window))
  - sum(expenses.amount where method='cash' and spent_on = business_date)   (if C1/C2)
  + sum(cash_movements signed-by-kind where session_id = session.id)
```
- Association-key mismatch: `payments.paid_at` timestamptz (needs `getClinicDayBounds` window); `expenses.spent_on` plain date; movements link by FK.
- Time-window vs. explicit FK for payments: hard FK unambiguous but requires caja open to insert a cash payment. Pure `paid_at BETWEEN` decoupled but boundary-fragile.
- View while open; snapshot into `cash_sessions` at close.

### E. Payments/expenses while caja CLOSED
| Option | Behavior | Pros | Cons |
|---|---|---|---|
| E1. Block | cash payment/expense insert fails if no open session | strong invariant | friction; blocks "forgot to open" |
| E2. Warn only | insert succeeds, UI shows "no hay caja abierta" | frictionless | arqueo silently off |
| E3. Queue to next opening | pending cash payments attach to next session | no lost data, no block | new "pending" state + reconciliation UI |
| E4. Auto-open session on first cash movement | opening_amount defaults to prev close | very classic ("carry the float") | hidden side effect in a payment action |
Only **cash** is ever blocked — card/transfer always pass.

## Architecture Fit
- New `src/features/cash/` slice, same shape as `sales`/`expenses`. `domain/theoretical-balance.ts` (pure, mirrors the SQL view), `domain/arqueo.ts` (difference + sobrante/faltante label), reuse `getClinicDayBounds`.
- `data/cash-session.ts` (open/close/reopen), `data/cash-movements.ts`, `data/cash-balance.ts`. `actions/*` (`'use server'`, zod, `revalidatePath('/caja')`).
- Guard logic in Postgres: `BEFORE INSERT` trigger on `payments` (and `expenses`) consulting the open session; thin RPC if multi-step open/close needs atomicity. Close = one `UPDATE cash_sessions`, a `BEFORE UPDATE` trigger validates and snapshots the theoretical total.
- RLS: `cash_sessions`, `cash_movements` each `enable row level security` + standard `is_staff()` policy. FK `opened_by/closed_by/created_by -> staff(id)`.

## /ventas vs /caja
| Option | Description | Pros | Cons | Effort |
|---|---|---|---|---|
| V1. Keep `/ventas`, add `/caja` | ledger unchanged; Caja owns open/close/arqueo/movements | additive; zero regression | two money screens | Low-Med |
| V2. Replace `/ventas` with `/caja` | Caja is the daily ops hub; sale detail/payment moves under it | one coherent model | larger blast radius; touches verified E2E | Med-High |
| V3. `/caja` hub + `/ventas` demoted to sub-report | Caja primary nav; "Ventas / historial" link inside it | best UX | nav/IA rework; same E2E risk as V2 | Med |

## Migration Ordering (next = 0011)
Likely single `0011_cash_register.sql` (or split): (1) `alter table expenses add column method` if C1/C2; (2) `create table cash_sessions` + indexes + RLS; (3) `create table cash_movements` + index + RLS; (4) `create view cash_session_theoretical`; (5) guard trigger(s) + `close_cash_session` RPC; (6) separate: `scripts/seed-demo.mjs` update.
Constraint: `expenses.method` must exist before any trigger/view references it.

## Reuse Opportunities
- `getClinicDayBounds` / `CLINIC_TZ` for the `payments.paid_at` window.
- `payments_reject_overpayment` = template for a `FOR UPDATE`-locking `BEFORE INSERT` guard trigger.
- `deriveSaleBalance` <-> `sale_balances` view = exact template for `deriveTheoreticalCash` <-> `cash_session_theoretical` view.
- `payment-errors.ts` `mapPaymentError` = template for mapping caja guard exceptions to Spanish.
- `is_staff()` RLS one-liner, copy verbatim.
- `expenses` slice CRUD + `schema.ts` + form = template for `cash_movements` CRUD.
- Integration-test harness for trigger/lock/one-session-per-day tests.
- `sale-status-badge` = pattern for an arqueo sobrante/faltante badge.

## Risks
- Editing/voiding a `payment`/`expense` inside an already-closed session retroactively changes a historical arqueo unless theoretical is snapshotted at close.
- Coupling `payments` insert to an open session (E1/E3/E4) touches the verified MVP E2E golden path — regression risk.
- `expenses.method` backfill: existing rows get `default 'cash'`, may misclassify historical non-cash expenses (low impact pre-prod).
- BA-day-boundary edge: cash payment at 23:30/00:30 local, or "yesterday's" payment entered next morning, lands in wrong session.
- `staff.id` vs `auth.users.id` confusion in FK definitions.
- Scope creep: multi-drawer, shift handover, X/Z reports — proposal must fence the MVP.
- `clinic_settings.timezone` is dead config.
- Concurrent open of same `business_date` — `UNIQUE(business_date)` handles it at DB; action maps to "ya hay una caja abierta hoy".

## Open Questions for the Proposal
1. `expenses` method: C1 / C2 / C3 / C4? C1+link combo?
2. `cash_movements`: fixed `kind` enum vs. reuse `expense_categories`? Signed amount vs. kind-derived sign?
3. Cash payment/expense while caja closed: E1 / E2 / E3 / E4? Card & transfer always pass.
4. Payment<->session association: hard FK vs. `paid_at` time-window?
5. Reopen a closed session: allowed? audit trail? who can?
6. Arqueo difference & theoretical total: snapshot at close (recommended) vs. always-derived view?
7. `/ventas` fate: V1 / V2 / V3?
8. Opening float: manual entry daily vs. carry previous close's `counted_amount`?
9. One-session-per-day: `UNIQUE(business_date)` hard, or void+new pair via partial unique index?
10. Promote `CLINIC_TZ` to shared `src/lib/clinic-tz.ts` now vs. import from `dashboard/domain/schedule.ts`?
11. Does `cash_sessions` need staff-scoped opener or is single-operator assumed?

## Recommendation
Proceed to `sdd-propose`. Recommended default posture to refine:
- **C1** for `expenses.method` (4-value enum, `default 'cash'`).
- Dedicated **`cash_sessions`** (`UNIQUE business_date`) + **`cash_movements`** (fixed `kind` enum, kind-derived sign).
- **Snapshot** theoretical + difference onto `cash_sessions` at close; **view** only for the live open session.
- **E2 (warn)** for the first slice, schema shaped so E1 (block) can be added later without migration churn.
- **V1** (`/ventas` stays, new `/caja`) as first deliverable; V2/V3 as a follow-up change.
- Reuse `getClinicDayBounds`; import `CLINIC_TZ` rather than a bigger refactor.
