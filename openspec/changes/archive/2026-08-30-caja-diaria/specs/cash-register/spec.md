# Cash Register Specification

## Purpose

Represent physical cash for the single-operator clinic: a daily apertura/cierre
cycle with an end-of-day arqueo that reconciles a counted drawer against a
theoretical balance derived from cash payments, cash expenses, and manual cash
movements. All dates use the `America/Argentina/Buenos_Aires` calendar day via
`getClinicDayBounds`.

## ADDED Requirements

### Requirement: Daily session lifecycle

The system MUST allow at most one `cash_sessions` row per Buenos Aires calendar
day (`UNIQUE(business_date)`). Opening MUST record a manually entered
`opening_amount >= 0`, `opened_by`, and `opened_at`. The form MAY prefill the
previous session's `counted_amount`, but the stored `opening_amount` MUST be
exactly the operator-entered value with no database carry-forward. A session
`status` MUST move only `open -> closed`; a closed session is terminal and MUST
NOT be reopened or edited in this capability.

#### Scenario: Open the day

- GIVEN no `cash_sessions` row exists for today's business date
- WHEN staff submits apertura with `opening_amount = 5000`
- THEN an `open` session is created with `opening_amount = 5000` and `opened_by` set

#### Scenario: Prefill is advisory only

- GIVEN yesterday's session closed with `counted_amount = 8200`
- WHEN staff opens today and submits `opening_amount = 8000`
- THEN the stored `opening_amount` is `8000`, not `8200`

#### Scenario: Closed session is terminal

- GIVEN a `closed` session for today
- WHEN any request attempts to set its status back to `open`
- THEN the update is rejected and the session stays `closed`

### Requirement: Duplicate-date rejection

The system MUST reject a second session for a business date that already has one,
and the action layer MUST surface a Spanish message such as
"ya existe una caja para hoy".

#### Scenario: Second apertura same day

- GIVEN an `open` session already exists for today
- WHEN staff submits apertura again for today
- THEN the insert fails on `UNIQUE(business_date)` and the user sees a Spanish error

### Requirement: Cash movements

`cash_movements` MUST link to a session and use `kind` restricted to exactly
`retiro`, `ingreso`, `ajuste`. `amount` MUST be `> 0`. The signed contribution to
the theoretical balance MUST be derived: `retiro` negative, `ingreso` positive,
`ajuste` multiplied by a required `direction` of `+1` or `-1`. Supplier payments
and employee advances are NOT movements; they are `expenses` with `method='cash'`.

#### Scenario: Record a withdrawal

- GIVEN an `open` session
- WHEN staff records a `retiro` of `1000` to the bank
- THEN the movement persists and contributes `-1000` to the theoretical balance

#### Scenario: Record a signed adjustment

- GIVEN an `open` session
- WHEN staff records an `ajuste` of `250` with `direction = -1`
- THEN the movement persists and contributes `-250`

#### Scenario: Reject non-positive amount

- WHEN staff submits any movement with `amount = 0` or negative
- THEN the insert is rejected by a CHECK constraint

### Requirement: Closed-caja warning is non-blocking

When a cash payment or cash expense is recorded and no `open` session exists for
its business date, the write MUST still succeed and the UI MUST show a warning
such as "no hay caja abierta hoy". Card and transfer payments/expenses MUST NOT
warn.

#### Scenario: Cash payment with no open caja

- GIVEN no `open` session for today
- WHEN staff registers a `cash` payment against a sale
- THEN the payment row is inserted and the UI surfaces the Spanish warning

#### Scenario: Card payment never warns

- GIVEN no `open` session for today
- WHEN staff registers a `card` payment
- THEN the payment succeeds with no warning

### Requirement: Theoretical balance derivation

While a session is `open`, a view MUST derive
`theoretical = opening_amount + sum(cash payments with paid_at in the BA-day
window) + sum(signed cash_movements) - sum(cash expenses where spent_on =
business_date)`. Only `method='cash'` payments and expenses MUST affect it; card
and transfer amounts MUST be excluded and reported separately.

#### Scenario: Only cash moves the needle

- GIVEN opening `5000`, a `cash` payment `3000`, a `transfer` payment `9000`, and a `cash` expense `1000`
- WHEN the theoretical balance is derived
- THEN it equals `7000` and the `9000` transfer is excluded

### Requirement: Closing arqueo

Closing MUST require a non-null `counted_amount >= 0`. At close the system MUST
snapshot `theoretical_amount` and `difference = counted_amount - theoretical_amount`
onto the `cash_sessions` row. The UI MUST label a positive difference `sobrante`,
a negative difference `faltante`, and zero as cuadrada.

#### Scenario: Close with a shortfall

- GIVEN an `open` session with derived theoretical `7000`
- WHEN staff closes with `counted_amount = 6800`
- THEN `theoretical_amount = 7000`, `difference = -200`, and the arqueo shows `faltante`

#### Scenario: Close without a count is rejected

- WHEN staff attempts to close with a null `counted_amount`
- THEN the close is rejected and the session stays `open`

### Requirement: Arqueo snapshot immutability

Once a session is `closed`, editing, voiding, or adding a payment, expense, or
movement dated within that session's day MUST NOT change the stored
`theoretical_amount` or `difference`.

#### Scenario: Post-close edit does not rewrite history

- GIVEN a `closed` session with `theoretical_amount = 7000`, `difference = -200`
- WHEN a `cash` payment from that business date is later edited to a larger amount
- THEN the session's stored `theoretical_amount` and `difference` remain `7000` and `-200`

### Requirement: Expense payment-method attribution

`expenses` MUST have a `method` column constrained to
`('cash','card','transfer','other')` defaulting to `'cash'`, mirroring
`payments.method`. Existing rows adopt the default.

#### Scenario: New expense defaults to cash

- WHEN staff creates an expense without choosing a method
- THEN it is stored with `method='cash'` and counts toward the theoretical balance

#### Scenario: Transfer expense excluded from arqueo

- GIVEN a `transfer` expense of `4000` dated today
- WHEN the theoretical balance is derived
- THEN the `4000` is not subtracted from the drawer

### Requirement: Staff-only access

`cash_sessions` and `cash_movements` MUST each enable row level security with a
single policy `for all to authenticated using (public.is_staff()) with check
(public.is_staff())`. Actor columns (`opened_by`, `closed_by`, `created_by`) MUST
reference `staff(id)`.

#### Scenario: Non-staff denied

- GIVEN an authenticated user with no `staff` row
- WHEN they query `cash_sessions` or `cash_movements`
- THEN RLS returns zero rows and writes are rejected
