# Tasks: Caja Diaria

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1030 total — A ~370, B ~340, C ~320 |
| 400-line budget risk | Medium (Slice A borderline) |
| Chained PRs recommended | Yes |
| Suggested split | PR A → PR B → PR C. Split A into A1 (migration 0011 + integration tests, ~285) + A2 (expenses.method wiring, ~85) only if A measures over 400 at apply. |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending (user picks stacked-to-main vs feature-branch-chain) |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: Medium

Per-slice detail: A = SQL 175 + expenses wiring 50 + integration tests 145. B = src 200 + unit tests 140. C = page/components 250 + warning wiring 45 + E2E 25. Chain order A → B → C (B imports A's columns; C imports B's actions). No slice forecast over 400, so no size:exception expected; A gets the A1/A2 fallback if real counts disagree.

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|------|------|-----------|----------------------|-----------------|-------------------|
| A | Migration 0011 + expenses.method threaded through | PR A | `pnpm test tests/integration/cash` | local `supabase start` | drop DDL in reverse order (triggers→functions→view→tables→`current_staff_id`→`expenses.method`) |
| A1 (fallback) | 0011 DDL + its integration tests | PR A1 | `pnpm test tests/integration/cash` | local `supabase start` | drop DDL reverse order |
| A2 (fallback) | `expenses.method` schema/data/form/columns/actions | PR A2 | `pnpm test features/expenses` | manual expense CRUD | revert `src/features/expenses/*` |
| B | cash domain + data + actions + unit tests | PR B | `pnpm test features/cash` | N/A — pure domain + data layer, no runtime surface | delete `src/features/cash/` |
| C | /caja page + components + nav + closed-caja warning | PR C | `pnpm test` + `playwright test e2e` | seeded local stack | remove `/caja` route + components, revert `nav-items.ts` and the payment/expense warning hooks |

## Phase A: Migration 0011 + expenses.method (Slice A)

- [x] A.1 RED: integration test duplicate `business_date` → 23505, Spanish message — `tests/integration/cash/sessions.test.ts` (Req: Duplicate-date rejection, Daily session lifecycle)
- [x] A.2 RED: integration test `cash_movements.amount > 0` CHECK and `kind_matches_direction` CHECK — `tests/integration/cash/movements.test.ts` (Req: Cash movements)
- [x] A.3 RED: integration test movement insert on a closed session → rejected — `tests/integration/cash/movements.test.ts` (Req: Cash movements, Daily session lifecycle)
- [x] A.4 RED: integration test close with null `counted_amount` → rejected; `closed_session_is_complete` CHECK — `tests/integration/cash/close.test.ts` (Req: Closing arqueo)
- [x] A.5 RED: integration test close snapshots correct `theoretical_amount`/`difference`; later edit of a same-day payment/expense leaves stored values unchanged — `tests/integration/cash/close.test.ts` (Req: Closing arqueo, Arqueo snapshot immutability)
- [x] A.6 RED: integration test RLS denial for a non-staff JWT on `cash_sessions` and `cash_movements` — `tests/integration/cash/rls.test.ts` (Req: Staff-only access)
- [x] A.7 RED: integration parity test — shipped `.skip` in `tests/integration/cash/parity.test.ts` (needs Slice B `deriveTheoreticalCash`); un-skipped in B.16
- [x] A.8 GREEN: `supabase/migrations/0011_cash_register.sql` per design steps 1–8, plus a `create or replace` of `public.truncate_table` extending its allow-list with the two new tables
- [x] A.9 GREEN: `src/features/expenses/schema.ts` — `method` zod enum `cash|card|transfer|other`, default `cash`; also exports `EXPENSE_METHODS` + `EXPENSE_METHOD_LABEL`
- [x] A.10 GREEN: `src/features/expenses/data/expenses.ts` — `method` threaded into `ExpenseRow`, `SELECT_COLUMNS`, `toExpenseRow`, insert + update
- [x] A.11 GREEN: `expense-form.tsx` method `Select` + hidden input, `columns.tsx` "Medio" column, `create-expense.ts` / `update-expense.ts` pass `method` into `safeParse`
- [x] A.12 GREEN: `scripts/seed-demo.mjs` — cash tables in truncate order, expense `method` (~60% cash), today's open session (opening 20000) + 3 movements, yesterday closed (guarded on a local `staff` row)

## Phase B: cash feature slice (Slice B) — B.1–B.11 parallelizable; data B.12–B.14 after B.11

> Implemented + fully green (210 passed / 0 skipped, lint + typecheck clean) on branch
> `caja-diaria-pr-b`. **NOT committed** — Slice B measured 1145 changed lines, over the
> 400 review budget. Awaiting a delivery decision (sub-slice split or size:exception).

- [x] B.1 RED: unit `signedAmount` / `directionForKind` incl. bidirectional `ajuste` — `tests/unit/features/cash/movement.test.ts` (Req: Cash movements)
- [x] B.2 GREEN: `src/features/cash/domain/movement.ts`
- [x] B.3 RED: unit `deriveTheoreticalCash` mirrors the view formula, cash-only — `tests/unit/features/cash/theoretical-balance.test.ts` (Req: Theoretical balance derivation)
- [x] B.4 GREEN: `src/features/cash/domain/theoretical-balance.ts`
- [x] B.5 RED: unit `deriveArqueo` sobrante/faltante/exacto + 0.005 boundary; `ARQUEO_LABEL` — `tests/unit/features/cash/arqueo.test.ts` (Req: Closing arqueo)
- [x] B.6 GREEN: `src/features/cash/domain/arqueo.ts`
- [x] B.7 RED: unit `mapCashError` — 23505 duplicate-date + both trigger exceptions → Spanish — `tests/unit/features/cash/cash-errors.test.ts` (Req: Duplicate-date rejection, Daily session lifecycle)
- [x] B.8 GREEN: `src/features/cash/domain/cash-errors.ts`
- [x] B.9 RED: unit `cashWithoutOpenSession` — cash + no session → warning; card + no session → null — `tests/unit/features/cash/closed-caja-warning.test.ts` (Req: Closed-caja warning is non-blocking)
- [x] B.10 GREEN: `src/features/cash/domain/closed-caja-warning.ts`
- [x] B.11 GREEN: `src/features/cash/schema.ts` — `openSessionSchema`, `closeSessionSchema`, `movementSchema`
- [x] B.12 GREEN: `src/features/cash/data/cash-session.ts` — `getSessionForDate`, `getOpenSession`, `listSessions`, `openSession`, `closeSession`
- [x] B.13 GREEN: `src/features/cash/data/cash-movements.ts` — `listMovements`, `createMovement`, `deleteMovement`
- [x] B.14 GREEN: `src/features/cash/data/cash-balance.ts` — `getTheoretical` (view), `listTodayCashPayments`, `listCashExpensesForDate`
- [x] B.15 GREEN: `src/features/cash/actions/{open-session,close-session,register-movement}.ts` — `'use server'`, zod re-parse, data call, `mapCashError`, `revalidatePath('/caja')`
- [x] B.16 Un-skip A.7 parity test; run against real Postgres; confirm green

## Phase C: /caja UI + closed-caja warning (Slice C)

- [ ] C.1 GREEN: `src/app/(dashboard)/caja/page.tsx` — RSC, routing only, injects `AppSupabaseClient` into `data/`
- [ ] C.2 GREEN: `src/features/cash/components/` — `open-session-form`, `close-session-form`, `movement-form`, `movement-table`, `today-cash-payments`, `arqueo-badge`, `session-summary-card` (Req: Closing arqueo, Cash movements, Theoretical balance derivation)
- [ ] C.3 GREEN: `src/components/nav-items.ts` — add `{ title: "Caja", href: "/caja", icon: Banknote }` before "Ventas"; keep "Ventas"
- [ ] C.4 RED: unit/integration test — `registerPaymentAction` yields `warning` for cash + no open session, `null` for card — `tests/unit/features/sales/register-payment-warning.test.ts` (Req: Closed-caja warning is non-blocking)
- [ ] C.5 GREEN: `src/features/sales/actions/register-payment.ts` — after insert commits, try/catch `getSessionForDate`, add non-blocking `warning` to form state
- [ ] C.6 GREEN: `src/features/sales/components/register-payment-form.tsx` — render `state.warning` with `role="status"` (never `role="alert"`)
- [ ] C.7 GREEN: expense path — `createExpenseAction`/`updateExpenseAction` redirect to `/gastos?aviso=caja-cerrada` when cash + no open session; `src/app/(dashboard)/gastos/page.tsx` renders the banner (Req: Closed-caja warning is non-blocking)
- [ ] C.8 E2E: re-run existing golden path unchanged (proves no regression); optional new `e2e/caja.spec.ts` — open → movement → close → arqueo badge

## Notes

- Strict TDD: every GREEN task has its RED test first; SQL invariants tested against real local Postgres, never mocked. `test_command` = `pnpm test`.
- Threat matrix: design declares N/A (no shell/subprocess/VCS/executable boundary). RLS covered by A.6.
- Sequential between phases (B imports A's `expenses.method` and view; C imports B's actions). Parallel within B as annotated.
