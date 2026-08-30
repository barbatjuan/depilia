# Design: Caja Diaria (daily cash register)

## Technical Approach

One additive migration (`0011_cash_register.sql`) plus one new feature slice (`src/features/cash/`) shaped exactly like `sales`. Money invariants stay in Postgres (CHECK + `BEFORE` triggers with `FOR UPDATE` locks, per MVP decision 2); the live theoretical balance stays a **view** (decision 5); the closed arqueo is the one deliberate exception — a **snapshot** written by the close trigger, because a view over mutable `payments`/`expenses` would retroactively rewrite history. `/ventas`, `/ventas/[id]`, and the verified E2E golden path are untouched.

## Architecture Decisions

| # | Decision | Chose | Rejected | Rationale |
|---|---|---|---|---|
| 1 | Movement sign | `direction ('in','out')` column, `amount > 0`, CHECK pins `ingreso→in` / `retiro→out` and leaves `ajuste` free | Sign from `kind` alone; signed `amount`; `ajuste_positivo`/`ajuste_negativo` kinds | `ajuste` is inherently bidirectional, so kind alone cannot sign it. Splitting it breaks locked decision 4's three-kind list. `direction` gives **one** sign expression (`case direction when 'in' then amount else -amount end`) reused verbatim by the view, the trigger, and `domain/movement.ts` |
| 2 | Signed amount storage | Computed in view + domain fn | `generated always as (...) stored` column | A generated column cannot drift either, but decision 5's posture is "derived values are views". One expression, three call sites, one parity test |
| 3 | Live theoretical | View `cash_session_theoretical`, **`where status='open'`** | View over all sessions | A closed row already carries its snapshot; excluding it makes "the view is only ever the live number" a structural fact, not a convention |
| 4 | Close | `BEFORE UPDATE` trigger on `cash_sessions` firing only on `open→closed`; computes theoretical once, writes `theoretical_amount`, `difference`, `closed_at`, `closed_by` | Server action computing it in TS; `close_cash_session` RPC | An action is two round trips with no lock. A trigger cannot be bypassed by any other `UPDATE`, exactly like `payments_reject_overpayment` |
| 5 | Closed-caja cash | **No trigger** on `payments`/`expenses`. UI/action-layer read of "is there an open session for this date" → non-blocking warning | `BEFORE INSERT` guard trigger (E1) | Locked decision 5. A trigger on `payments` touches the verified golden path; warn-only keeps it green and leaves E1 a pure follow-up |
| 6 | Movements ↔ session | `BEFORE INSERT` trigger on `cash_movements` locking the parent `FOR UPDATE` and requiring `status='open'` | No trigger | New table, zero blast radius. It gives movements the serialization point against a concurrent close that payments deliberately forgo |
| 7 | Actor identity | `public.current_staff_id()` (SECURITY DEFINER, STABLE) as `opened_by`/`created_by` DEFAULT; close trigger stamps `closed_by` | Resolve `staff.id` in TS per action | Nothing in `src/` resolves `staff.id` from `auth.uid()` today. A DB default adds zero TS plumbing and cannot be forgotten |
| 8 | Day window | SQL uses `AT TIME ZONE 'America/Argentina/Buenos_Aires'`; TS reuses `getClinicDayBounds` | Store a window on the session; read `clinic_settings.timezone` | Named IANA zone is correct in SQL; the TS helper's hardcoded UTC-3 agrees today. A parity integration test is the guard |

## Migration `0011_cash_register.sql` (ordered)

```sql
-- 1. expenses.method FIRST — the view in step 6 references it.
alter table expenses add column method text not null default 'cash'
  check (method in ('cash','card','transfer','other'));
create index expenses_cash_spent_on_idx on expenses (spent_on) where method = 'cash';
create index payments_cash_paid_at_idx  on payments (paid_at)  where method = 'cash';

-- 2. actor helper
create function public.current_staff_id() returns uuid
  language sql stable security definer set search_path = public as
$$ select id from staff where user_id = auth.uid() and active limit 1 $$;

-- 3. sessions
create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,                    -- one caja per BA day
  status text not null default 'open' check (status in ('open','closed')),
  opening_amount numeric(12,2) not null check (opening_amount >= 0),
  opened_at timestamptz not null default now(),
  opened_by uuid not null default public.current_staff_id() references staff (id),
  counted_amount numeric(12,2) check (counted_amount >= 0),
  theoretical_amount numeric(12,2),
  difference numeric(12,2),
  closing_note text,
  closed_at timestamptz,
  closed_by uuid references staff (id),
  constraint closed_session_is_complete check (
    status = 'open' or (counted_amount is not null
                        and theoretical_amount is not null
                        and difference is not null
                        and closed_at is not null)));

-- 4. movements
create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references cash_sessions (id) on delete restrict,
  kind text not null check (kind in ('retiro','ingreso','ajuste')),
  direction text not null check (direction in ('in','out')),
  amount numeric(12,2) not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null default public.current_staff_id() references staff (id),
  constraint kind_matches_direction check (
    (kind = 'ingreso' and direction = 'in')
    or (kind = 'retiro' and direction = 'out')
    or kind = 'ajuste'));                                 -- ajuste is bidirectional
create index cash_movements_session_id_idx on cash_movements (session_id);

-- 5. RLS — is_staff() policy verbatim on both tables
alter table cash_sessions  enable row level security;
alter table cash_movements enable row level security;
create policy "cash_sessions_staff_all"  on cash_sessions  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "cash_movements_staff_all" on cash_movements for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 6. live theoretical (OPEN sessions only)
create view cash_session_theoretical as
select s.id as session_id, s.business_date, s.opening_amount,
       coalesce(p.cash_in, 0)  as cash_payments,
       coalesce(m.net, 0)      as movements_net,
       coalesce(e.cash_out, 0) as cash_expenses,
       s.opening_amount + coalesce(p.cash_in,0) + coalesce(m.net,0)
                        - coalesce(e.cash_out,0) as theoretical_amount
from cash_sessions s
left join lateral (select sum(amount) as cash_in from payments
  where method = 'cash'
    and paid_at >= (s.business_date::timestamp     at time zone 'America/Argentina/Buenos_Aires')
    and paid_at <  ((s.business_date+1)::timestamp at time zone 'America/Argentina/Buenos_Aires')) p on true
left join lateral (select sum(case when direction='in' then amount else -amount end) as net
  from cash_movements where session_id = s.id) m on true
left join lateral (select sum(amount) as cash_out from expenses
  where method = 'cash' and spent_on = s.business_date) e on true
where s.status = 'open';

-- 7. movements only on an open session (locks the parent, serializing vs. close)
create function public.cash_movements_require_open_session() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select status into v_status from cash_sessions where id = new.session_id for update;
  if v_status is distinct from 'open' then
    raise exception 'cash_session_not_open: session % is not open', new.session_id
      using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger cash_movements_require_open_session_trg
  before insert on cash_movements for each row
  execute function public.cash_movements_require_open_session();

-- 8. close snapshot (open -> closed only; close is terminal)
create function public.cash_sessions_close_snapshot() returns trigger
  language plpgsql security definer set search_path = public as $$
declare v_theoretical numeric(12,2);
begin
  if old.status = 'closed' then
    raise exception 'cash_session_already_closed: session % is closed', old.id
      using errcode = 'check_violation';
  end if;
  if new.status <> 'closed' then return new; end if;            -- still open: pass through
  if new.counted_amount is null then
    raise exception 'cash_session_count_required: counted_amount is required to close'
      using errcode = 'check_violation';
  end if;

  select new.opening_amount
    + coalesce((select sum(amount) from payments where method='cash'
        and paid_at >= (new.business_date::timestamp     at time zone 'America/Argentina/Buenos_Aires')
        and paid_at <  ((new.business_date+1)::timestamp at time zone 'America/Argentina/Buenos_Aires')), 0)
    + coalesce((select sum(case when direction='in' then amount else -amount end)
        from cash_movements where session_id = new.id), 0)
    - coalesce((select sum(amount) from expenses
        where method='cash' and spent_on = new.business_date), 0)
  into v_theoretical;

  new.theoretical_amount := v_theoretical;
  new.difference         := new.counted_amount - v_theoretical;
  new.closed_at          := coalesce(new.closed_at, now());
  new.closed_by          := coalesce(new.closed_by, public.current_staff_id());
  return new;
end $$;
create trigger cash_sessions_close_snapshot_trg
  before update on cash_sessions for each row
  execute function public.cash_sessions_close_snapshot();
```

The `UPDATE` in step 8 already row-locks the session; step 7's `FOR UPDATE` is what makes a concurrent movement insert wait for that close to commit and then fail on `status='closed'`. **Payments and expenses take no such lock by design** (decision 5) — a cash payment committing after the snapshot is the accepted E2 residual, and `ajuste` is its escape hatch.

## Data Flow

```
open:   OpenSessionForm ─▶ openSessionAction ─▶ data/cash-session.openSession ─▶ INSERT
                                                        (23505 on business_date ─▶ Spanish)
live:   /caja (RSC) ─▶ data/cash-balance ─┬─▶ cash_session_theoretical (view)  ── authority
                                          └─▶ raw rows ─▶ deriveTheoreticalCash ── rendered
close:  CloseSessionForm ─▶ closeSessionAction ─▶ UPDATE cash_sessions
                                       └─▶ BEFORE UPDATE trigger ─▶ snapshot (immutable)
warn:   registerPaymentAction / createExpenseAction ─▶ getSessionForDate(today)
                                       └─▶ null && method='cash' ─▶ warning (never blocks)
```

Following the `deriveSaleBalance` ↔ `sale_balances` precedent: the pure TS fn renders the number, the SQL view and the trigger are the authority at close, and one integration test asserts **all three agree** on identical data.

## File Changes

| File | Action | Description |
|---|---|---|
| `supabase/migrations/0011_cash_register.sql` | Create | The DDL above, in that order |
| `src/features/cash/domain/movement.ts` | Create | `MovementKind`, `MovementDirection`, `signedAmount`, `directionForKind` |
| `src/features/cash/domain/theoretical-balance.ts` | Create | `deriveTheoreticalCash` — mirrors the view |
| `src/features/cash/domain/arqueo.ts` | Create | `deriveArqueo` → `{ difference, status }`, `ARQUEO_LABEL` |
| `src/features/cash/domain/cash-errors.ts` | Create | `mapCashError` — PG code/message → Spanish (`payment-errors.ts` template) |
| `src/features/cash/domain/closed-caja-warning.ts` | Create | `cashWithoutOpenSession`, `CLOSED_CAJA_WARNING` |
| `src/features/cash/data/cash-session.ts` | Create | `getSessionForDate`, `getOpenSession`, `listSessions`, `openSession`, `closeSession` |
| `src/features/cash/data/cash-movements.ts` | Create | `listMovements`, `createMovement`, `deleteMovement` |
| `src/features/cash/data/cash-balance.ts` | Create | `getTheoretical` (view), `listTodayCashPayments`, `listCashExpensesForDate` |
| `src/features/cash/actions/{open,close}-session.ts`, `register-movement.ts` | Create | `'use server'` → zod re-parse → data → `revalidatePath('/caja')` |
| `src/features/cash/schema.ts` | Create | `openSessionSchema`, `closeSessionSchema`, `movementSchema` |
| `src/features/cash/components/*.tsx` | Create | `open-session-form`, `close-session-form`, `movement-form`, `movement-table`, `today-cash-payments`, `arqueo-badge`, `session-summary-card` |
| `src/app/(dashboard)/caja/page.tsx` | Create | RSC, routing only; injects `AppSupabaseClient` into `data/` |
| `src/components/nav-items.ts` | Modify | Add `{ title: "Caja", href: "/caja", icon: Banknote }` before "Ventas"; "Ventas" stays |
| `src/features/expenses/{schema.ts,data/expenses.ts,components/expense-form.tsx,components/columns.tsx,actions/*}` | Modify | Thread `method` through zod → row → insert/update → form select → table column |
| `src/features/sales/actions/register-payment.ts` | Modify | Add `warning` to form state; post-insert, non-blocking |
| `src/features/sales/components/register-payment-form.tsx` | Modify | Render `state.warning` with `role="status"` (never `role="alert"`) |
| `src/app/(dashboard)/gastos/page.tsx` | Modify | Render banner when `?aviso=caja-cerrada` |
| `scripts/seed-demo.mjs` | Modify | See below |

## Interfaces / Contracts

```ts
// domain/movement.ts
export type MovementKind = "retiro" | "ingreso" | "ajuste";
export type MovementDirection = "in" | "out";
export const KIND_DIRECTION: Record<MovementKind, MovementDirection | null> =
  { ingreso: "in", retiro: "out", ajuste: null };          // null = operator picks
export function signedAmount(m: { direction: MovementDirection; amount: number }): number;
export function directionForKind(kind: MovementKind, chosen?: MovementDirection): MovementDirection;

// domain/theoretical-balance.ts — mirrors cash_session_theoretical exactly
export function deriveTheoreticalCash(input: {
  openingAmount: number;
  cashPayments: { amount: number }[];
  movements: { direction: MovementDirection; amount: number }[];
  cashExpenses: { amount: number }[];
}): { openingAmount: number; cashIn: number; movementsNet: number;
      cashOut: number; theoretical: number };

// domain/arqueo.ts
export type ArqueoStatus = "sobrante" | "faltante" | "exacto";
export function deriveArqueo(counted: number, theoretical: number):
  { difference: number; status: ArqueoStatus };            // |diff| < 0.005 -> "exacto"

// domain/closed-caja-warning.ts — the warn-don't-block rule, one pure place
export const CLOSED_CAJA_WARNING =
  "Registraste efectivo sin una caja abierta para hoy. Abrí la caja para que el arqueo cierre.";
export function cashWithoutOpenSession(
  input: { method: string; openSession: { id: string } | null },
): string | null;   // null unless method === "cash" && openSession === null
```

**Warning mechanism.** `registerPaymentAction` calls `getSessionForDate` **after** the insert commits and wraps it in try/catch — a failed check yields `warning: null`, never an error, so the golden path cannot regress. `createExpenseAction`/`updateExpenseAction` end in `redirect("/gastos")`, so they cannot return form state; they redirect to `/gastos?aviso=caja-cerrada` and the page renders the banner. Card/transfer/other short-circuit before the query.

**"Cobros en efectivo de hoy" panel.** `listTodayCashPayments(supabase, now)` — `getClinicDayBounds(now)` → `.eq("method","cash").gte("paid_at",start).lt("paid_at",end)`, selecting `id, amount, paid_at, note, sales(id, description, clients(first_name,last_name))`, ordered `paid_at desc`. Read-only; each row links to `/ventas/{sale_id}`.

## Seed (`scripts/seed-demo.mjs`)

1. Add `cash_movements` then `cash_sessions` to the `truncate_table` list, in that FK-restrict order, before `clients`.
2. Assign `method` when inserting expenses: ~60% `cash`, rest `transfer`/`card`, so the arqueo is not trivially all-cash.
3. Read the seeded `staff.id` (service-role client, `staff` is untouched catalog) for `opened_by`/`created_by`.
4. Insert one `cash_sessions` row for today's BA `business_date`, `status 'open'`, `opening_amount 20000`.
5. Insert 2–3 `cash_movements` on it: one `retiro`/`out`, one `ingreso`/`in`, optionally one `ajuste`/`out`.
6. Optionally close *yesterday's* session so `/caja` has history and the close form has a prior `counted_amount` to prefill.

## Testing Strategy

| Layer | What | Approach |
|---|---|---|
| Unit | `signedAmount`/`directionForKind`; `deriveTheoreticalCash`; `deriveArqueo` (sobrante/faltante/exacto, 0.005 boundary); `mapCashError`; `cashWithoutOpenSession` (cash+no session → warn; card+no session → null) | Vitest node, pure, no mocks |
| Integration | duplicate `business_date` → 23505; close without `counted_amount` → reject; close writes correct `theoretical_amount`/`difference`; **post-close payment/expense edit leaves the snapshot unchanged**; movement on a closed session → reject; `closed_session_is_complete` CHECK; RLS denial for non-staff JWT; **view ≡ trigger ≡ `deriveTheoreticalCash` parity**; SQL day window ≡ `getClinicDayBounds` | Vitest vs. local `supabase start`, `describe.sequential`, truncate between specs |
| E2E | Existing golden path re-run unchanged (proves no regression). Optional new spec: open → movement → close → arqueo badge | Playwright, seeded local stack |

Strict TDD: failing test first, every task. SQL guarantees tested against real Postgres, never mocked.

## Threat Matrix

N/A — no shell commands, subprocesses, VCS/PR automation, executable-file classification, or process-integration boundary. `/caja` is app routing, not command routing. RLS + the `is_staff()` policy are covered by an integration denial test.

## Migration / Rollout

Additive; no data migration. Rollback in reverse: drop the two triggers and their functions → drop `cash_session_theoretical` → drop `cash_movements` → drop `cash_sessions` → drop `current_staff_id()` → drop `expenses.method`. Existing `expenses` rows adopt `default 'cash'` — pre-production volume, documented assumption.

### Slice split vs. the 400-line review budget

| Slice | Contents | Est. changed lines | Risk |
|---|---|---|---|
| A | `0011_cash_register.sql` + `expenses.method` threaded through schema/data/form/columns/actions + integration tests for the DDL | ~360 (SQL 175, expenses wiring 45, tests 140) | Medium — split into A1 (migration + its tests) / A2 (`expenses.method` wiring) if A2 grows past ~60 |
| B | `cash` domain (5 files) + `data` (3) + `actions` (3) + `schema.ts` + unit tests | ~340 (src 200, unit tests 140) | Medium |
| C | `/caja` page + 7 components + nav entry + the warning in the payment/expense paths + optional E2E | ~330 | Medium |

Each slice starts, finishes, verifies, and reverts on its own. Chain order A → B → C (B imports A's columns; C imports B's actions). Delivery strategy is `ask-on-risk`: no slice is forecast over 400, so no exception is expected.

## Deviations from the proposal's recommended posture

1. **Movement kinds reduced 5 → 3.** `adelanto` and `pago_proveedor` are `expenses(method='cash')`, per locked decision 4 — prevents double-counting.
2. **Sign is not derived from `kind` alone.** A `direction` column is added (decision 1 above) because `ajuste` is bidirectional. The proposal assumed kind-derived sign.
3. **Two modules beyond decision 7's list**: `domain/cash-errors.ts` (mirrors `payment-errors.ts`; needed for the 23505 duplicate-date and the two trigger exceptions) and `domain/closed-caja-warning.ts` (keeps the warn rule pure and shared by the payment and expense paths instead of duplicated in two actions).
4. **New DB helper `public.current_staff_id()`** — not in the proposal. Nothing in `src/` resolves `staff.id` from `auth.uid()` today, and decision 9 requires actor FKs to `staff(id)`.
5. **A `BEFORE INSERT` trigger on `cash_movements`.** Not a breach of decision 5 (which forbids triggers on `payments`/`expenses`), but it is an addition: a new table with zero blast radius, and it is the only serialization point against a concurrent close.
6. **Expense warning is delivered via `redirect("/gastos?aviso=caja-cerrada")`**, because the expense actions redirect and cannot return form state.

## Open Questions

- [ ] `ajuste` direction in the UI: a two-option toggle, or two buttons ("ajuste +" / "ajuste −") writing the same `kind`? Cosmetic; does not affect the schema.
- [ ] Should closing today's caja prefill `counted_amount` from the live theoretical? Convenient, but it invites blind confirmation and defeats the arqueo. Recommendation: leave it empty.
- [ ] Does a `/caja` KPI belong on the dashboard in this change, or as a follow-up? Currently out of scope.
