# Discount Codes Specification (new capability: discount-codes)

Change: promociones. New full spec.

## Purpose

Replace hand-tracked paper coupons with a validated, usage-capped
`discount_codes` table. A code is entered at checkout on either sell flow,
validated against its active flag, date window (BA business date at sale
time), and remaining uses, and its `used_count` is incremented atomically so
concurrent sales can never over-issue. Voiding a code-bearing sale returns the
use. Codes are administered at a sibling route `/configuracion/codigos`,
archive-only.

## Requirements

### Requirement: Discount code definition

`discount_codes` MUST have `code` (citext, or `lower(code)` functional
unique), `kind` (text, exactly `percent` or `fixed`), `value` (numeric,
`> 0`), `max_uses` (int, nullable — null means unlimited), `used_count` (int,
`NOT NULL`, default `0`, `CHECK >= 0`), `valid_from` / `valid_to` (date,
nullable), and `active` (boolean, `NOT NULL`, default `true`). A partial
unique index MUST enforce uniqueness of `lower(code)` `WHERE active`. A
`CHECK (max_uses IS NULL OR used_count <= max_uses)` MUST exist. Codes are
GLOBAL — no per-tariff / per-client targeting in this change. `is_staff()` RLS
MUST apply verbatim.

#### Scenario: Duplicate active code rejected

- GIVEN an active code `VERANO`
- WHEN a second active row with `code = 'verano'` is inserted
- THEN the partial unique index rejects it
- AND an archived (`active = false`) `VERANO` row is still allowed

#### Scenario: Over-cap used_count rejected

- WHEN a row update would set `used_count = 11` with `max_uses = 10`
- THEN the CHECK constraint rejects the update

### Requirement: Checkout validation

When a code is entered at checkout, it MUST be accepted only if it is
`active`, the BA business date at sale time is within `[valid_from,
valid_to]` (null bound = open), and (`max_uses IS NULL` OR `used_count <
max_uses`). A rejected code MUST surface a Spanish message distinguishing
inactive / out-of-window / exhausted / unknown. The resolved discount amount
MUST be computed by the same pure discount math as a manual discount and MUST
obey `total >= 0.01`.

#### Scenario: Valid code applied

- GIVEN active code `VERANO` = `10%`, `used_count = 3`, `max_uses = 100`, in window
- WHEN staff applies it to a `list_total = 200` sale
- THEN the sale is written with `discount_code_id` set, `discount_amount = 20`, `total = 180`

#### Scenario: Out-of-window code rejected

- GIVEN code `VERANO` with `valid_to` before today's BA business date
- WHEN staff applies it
- THEN checkout rejects it with a Spanish "fuera de vigencia" message and no sale is written

#### Scenario: Exhausted code rejected

- GIVEN code `VERANO` with `used_count = max_uses`
- WHEN staff applies it
- THEN checkout rejects it with a Spanish "agotado" message

### Requirement: Atomic usage guard

A BEFORE INSERT trigger on `sales` MUST, when `discount_code_id` is set, lock
the code row `FOR UPDATE`, re-check active / window / not-exhausted, reject
with an error if any fails, and otherwise increment `used_count` by 1 in the
same transaction. Concurrent inserts MUST NOT push `used_count` above
`max_uses`.

#### Scenario: Concurrent inserts never over-issue

- GIVEN code `LAST1` with `max_uses = 1`, `used_count = 0`
- WHEN two sales referencing `LAST1` are inserted concurrently
- THEN exactly one succeeds with `used_count = 1`
- AND the other is rejected by the trigger

### Requirement: Void returns the use

A trigger MUST decrement `used_count` by 1 when a code-bearing `sales` row
transitions `status` to `void`. `used_count` MUST NOT go below `0`. No other
promo-availability state is restored.

#### Scenario: Void decrements used_count

- GIVEN a sale with `discount_code_id = C` and `C.used_count = 5`
- WHEN the sale's `status` is set to `void`
- THEN `C.used_count = 4`

#### Scenario: Void of a non-code sale is a no-op

- GIVEN a voided sale with `discount_code_id IS NULL`
- WHEN the void trigger fires
- THEN no `discount_codes` row changes

### Requirement: Codes apply to both sell flows

Both **Vender paquete** and **Sesión suelta** MUST accept a discount-code
input. The XOR-with-manual rule from `sale-discounts` applies to both.

#### Scenario: Code on a loose session

- GIVEN active code `VERANO` = `fixed 5`
- WHEN staff applies it while selling a loose session with `list_total = 20`
- THEN the `sales` row has `discount_amount = 5`, `total = 15`, `discount_code_id` set

### Requirement: Codes ABM at /configuracion/codigos

`/configuracion/codigos` MUST let staff create, edit, and archive a code as
its own slice with its own `/configuracion` Card (not a tab on promociones).
Archiving MUST set `active = false` and MUST NOT hard-delete (FK on `sales` is
`SET NULL`). The list MUST support an `?archived=` filter.

#### Scenario: Archive instead of delete

- WHEN staff archives code `VERANO`
- THEN its row is retained with `active = false`
- AND sales that referenced it keep `discount_code_id` intact

## Test mapping

- Vitest unit: code validation predicate (active / window / exhausted),
  Spanish error mapping.
- Integration (local Postgres): partial unique on `lower(code) where active`,
  `used_count >= 0` and `<= max_uses` CHECKs, trigger increment, concurrent
  insert race (exactly-one), out-of-window / exhausted rejection, void
  decrement + floor at 0, RLS denial for non-staff.
