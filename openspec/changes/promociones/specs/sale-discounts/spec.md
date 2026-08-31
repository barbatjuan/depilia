# Sale Discounts Specification (new capability: sale-discounts)

Change: promociones. New full spec — `sales` had no discount concept.

## Purpose

Give `sales` a first-class money model: a pre-discount `list_total`, a
non-negative `discount_amount`, and a charged `total` that always equals the
difference. Support a manual percent or fixed discount at both checkout flows,
record who applied it and why, forbid fully-comped sales, and forbid stacking a
discount code with a manual discount. Caja, arqueo, `sale_balances`, and the
dashboard KPI are payment-driven and MUST NOT change.

## Requirements

### Requirement: Sales money-model columns

`sales` MUST gain `list_total` (numeric(12,2), `NOT NULL` after backfill),
`discount_amount` (numeric(12,2), `NOT NULL`, default `0`, `CHECK >= 0`),
`discount_reason` (text, nullable), `promotion_id` (uuid, FK `promotions` `ON
DELETE SET NULL`), `discount_code_id` (uuid, FK `discount_codes` `ON DELETE SET
NULL`), and `discounted_by` (uuid, FK `staff` `ON DELETE SET NULL`). A
`CHECK (total = list_total - discount_amount)` MUST exist. The existing
`total > 0` CHECK MUST remain.

#### Scenario: Backfill of pre-existing rows

- GIVEN a `sales` row that existed before migration `0015`
- WHEN `0015` runs
- THEN that row has `list_total = total`, `discount_amount = 0`
- AND `list_total` and `discount_amount` are `NOT NULL`

#### Scenario: Money identity enforced

- WHEN a `sales` row is inserted with `list_total = 100`, `discount_amount = 30`, `total = 80`
- THEN the `CHECK (total = list_total - discount_amount)` rejects the insert

#### Scenario: Negative discount rejected

- WHEN a `sales` row is inserted with `discount_amount = -5`
- THEN a CHECK constraint rejects the insert

### Requirement: No fully-comped sale

A discounted sale MUST keep `total >= 0.01`. A 100% discount (or any discount
that would drive `total` to `0` or below) MUST be rejected.

#### Scenario: 100% discount rejected

- GIVEN `list_total = 120`
- WHEN staff enters a discount of `120` (or `100%`)
- THEN the sale is rejected and no `sales` row is written

#### Scenario: Near-total discount allowed

- GIVEN `list_total = 120`
- WHEN staff enters a discount of `119.99`
- THEN the sale is accepted with `total = 0.01`

### Requirement: Discount math is pure and currency-rounded

Discount computation MUST live in a pure module (`domain/discount.ts`).
A `percent` discount MUST be `round(list_total * pct/100)` to the clinic
currency's fractional digits (`clinic-currency` spec); a `fixed` discount MUST
be taken verbatim. The result MUST be clamped so `discount_amount <=
list_total - 0.01` and `discount_amount >= 0`.

#### Scenario: Percent rounded to currency digits

- GIVEN clinic currency with 2 fractional digits and `list_total = 99.99`
- WHEN a `10%` discount is applied
- THEN `discount_amount = 10.00` and `total = 89.99`

#### Scenario: Fixed discount applied verbatim

- GIVEN `list_total = 100`
- WHEN a fixed discount of `15` is applied
- THEN `discount_amount = 15.00` and `total = 85.00`

### Requirement: Manual discount at both checkout flows

Both **Vender paquete** and **Sesión suelta** MUST accept an optional manual
discount (`percent` or `fixed`). When `discount_amount > 0`, `discount_reason`
MUST be required (non-empty) and `discounted_by` MUST be set to the acting
staff member. When no discount is applied, `list_total = total`,
`discount_amount = 0`, and `discount_reason` / `discounted_by` stay null.

#### Scenario: Discount requires a reason

- WHEN staff applies a discount but leaves the reason blank
- THEN the form is rejected with a validation error and no sale is written

#### Scenario: Audit recorded

- WHEN staff applies a `10%` discount with reason "fidelidad"
- THEN the `sales` row has `discount_reason = 'fidelidad'` and `discounted_by` = that staff id

#### Scenario: No discount leaves a clean snapshot

- WHEN staff confirms a sale without a discount
- THEN `list_total = total`, `discount_amount = 0`, `discount_reason IS NULL`, `discounted_by IS NULL`

### Requirement: Code XOR manual discount (no stacking)

A single sale MUST NOT carry both a `discount_code_id` and a manual discount.
Checkout MUST reject the combination before writing the sale. `discount_amount`
remains a single number regardless of which source produced it.

#### Scenario: Code plus manual rejected

- GIVEN staff has entered a valid discount code
- WHEN staff also enters a manual discount amount
- THEN checkout rejects the sale with a Spanish "no se pueden combinar" error

### Requirement: Derived views and caja unaffected

`sale_balances`, `deriveSaleBalance`, the cash-session theoretical/arqueo
views, and the dashboard revenue KPI MUST continue to derive from `payments`,
expenses, and movements only. A discount lowers `total` (the payment cap) but
MUST NOT be read by any of these.

#### Scenario: Balance follows the discounted total

- GIVEN a sale with `list_total = 120`, `discount_amount = 20`, `total = 100`
- WHEN a payment of `100` is recorded
- THEN `sale_balances` reports the sale as fully paid

#### Scenario: Caja theoretical ignores the discount

- GIVEN a discounted sale paid in cash
- WHEN the cash session theoretical is computed
- THEN it counts only the actual cash `payments.amount`, never `list_total` or `discount_amount`

## Test mapping

- Vitest unit (`domain/discount.ts`): percent rounding to currency digits,
  fixed verbatim, clamp to `>= 0` and `<= list_total - 0.01`, 100% rejected.
- Integration (local Postgres): backfill values + `NOT NULL`,
  `CHECK (total = list_total - discount_amount)`, `discount_amount >= 0`,
  `total > 0`, `discounted_by` / `discount_reason` persistence, `sale_balances`
  unchanged, caja theoretical unchanged.
- E2E: golden path still sells a package with no discount and clean snapshot.
