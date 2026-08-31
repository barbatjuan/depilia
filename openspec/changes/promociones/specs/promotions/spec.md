# Promotions Specification (new capability: promotions)

Change: promociones. New full spec. Promotions are combo + bonus only — there
is NO seasonal auto-discount (percent/fixed discounting lives only in
`discount-codes` and the manual per-sale discount).

## Purpose

Let staff define two kinds of promotion administered like tariffs: a `combo`
(a multi-tariff bundle sold as ONE sale with one payment plan and N client
packages) and a `bonus` (extra sessions on a single tariff, e.g. "6+2").
Promotions are picked in **Vender paquete** only, carry an optional date
window, and are archived, never deleted.

## Requirements

### Requirement: Promotion definition

`promotions` MUST have `name` (text, `NOT NULL`), `kind` (text, exactly
`combo` or `bonus`), `valid_from` / `valid_to` (date, nullable), and `active`
(boolean, `NOT NULL`, default `true`). It MUST NOT carry `percent` or
`fixed_amount` columns. `is_staff()` RLS MUST apply verbatim.

`promotion_items` MUST have `promotion_id` (uuid, FK `promotions` `ON DELETE
CASCADE`), `tariff_id` (uuid, FK `package_templates` `ON DELETE RESTRICT`),
`bonus_sessions` (int, `NOT NULL`, default `0`), and `override_price`
(numeric, nullable). A partial unique index MUST enforce
`(promotion_id, tariff_id)`.

#### Scenario: Invalid kind rejected

- WHEN a `promotions` row is inserted with `kind = 'percent'`
- THEN a CHECK constraint rejects the insert

#### Scenario: Duplicate tariff in one promotion rejected

- GIVEN promotion `P` already has an item for tariff `T`
- WHEN a second item for `T` is added to `P`
- THEN the unique index rejects it

#### Scenario: Tariff in use cannot be hard-deleted

- GIVEN `promotion_items` references tariff `T`
- WHEN `T` is deleted
- THEN the `ON DELETE RESTRICT` FK blocks the delete

### Requirement: sale_packages join

`sale_packages` MUST join one `sales` row to many `client_packages`
(`sale_id` FK `sales`, `client_package_id` FK `client_packages`). A combo sale
MUST write one `sales` row with `client_package_id` left NULL, N
`client_packages` rows, and N `sale_packages` join rows. The non-combo sell
path MUST keep using `sales.client_package_id` (1:1) unchanged.

#### Scenario: Multi-zone combo is one sale

- GIVEN combo `P` with items for tariffs `T1`, `T2`, `T3`
- WHEN staff sells `P` to a client
- THEN exactly one `sales` row is created with `client_package_id IS NULL` and `promotion_id = P`
- AND three `client_packages` rows are created
- AND three `sale_packages` rows link them to that sale

#### Scenario: One balance and payment plan for the combo

- GIVEN a combo sale with `total = 300` across 3 packages
- WHEN payments are recorded
- THEN `sale_balances` tracks a single balance of `300` for the one `sales` row
- AND there is no separate balance per `client_packages` row

#### Scenario: Non-combo sale unchanged

- WHEN staff sells a single package with no promotion
- THEN one `sales` row with `client_package_id` set and no `sale_packages` rows

### Requirement: Bonus-session math

For a `bonus` promotion, the sold `client_packages.total_sessions` MUST equal
the tariff's `default_sessions` plus the item's `bonus_sessions`. The sale
`total` MUST be the item's `override_price` when set, else the tariff's
`bono_price`. No per-session price changes.

#### Scenario: "6+2" bonus

- GIVEN tariff `T` with `default_sessions = 6`, `bono_price = 120`
- AND a `bonus` promotion item with `bonus_sessions = 2`, `override_price` null
- WHEN staff sells it
- THEN `client_packages.total_sessions = 8` and `sales.total = 120`

#### Scenario: Bonus with an override price

- GIVEN the same tariff and `override_price = 150`
- WHEN staff sells it
- THEN `sales.list_total = 150` and `sales.total = 150` (before any separate discount)

### Requirement: Promotions apply to Vender paquete only

A `combo` or `bonus` promotion MUST be selectable only in the **Vender
paquete** flow. **Sesión suelta** MUST NOT offer a promotion picker.

#### Scenario: No promotion picker on loose session

- WHEN staff opens the Sesión suelta form
- THEN there is no combo/bonus selector

### Requirement: Date window evaluated at sale time

A promotion's `[valid_from, valid_to]` window (null bound = open) MUST be
checked against the BA business date at the moment of sale only. It MUST NOT
be re-evaluated when an existing sale is later edited.

#### Scenario: Out-of-window promotion rejected at sale

- GIVEN promotion `P` with `valid_to` before today's BA business date
- WHEN staff tries to sell `P`
- THEN the sale is rejected with a Spanish "promoción fuera de vigencia" message

#### Scenario: Later edit does not re-check the window

- GIVEN a combo sale made while `P` was in window
- WHEN the sale is edited after `P.valid_to` has passed
- THEN the edit is not blocked by the promotion window

### Requirement: Promotions ABM at /configuracion/promociones

`/configuracion/promociones` MUST let staff create, edit, and archive a
promotion with its items, as its own slice with its own `/configuracion` Card.
Archiving MUST set `active = false` and MUST NOT hard-delete (FK on `sales` is
`SET NULL`). The list MUST support `?kind=` and `?archived=` filters.

#### Scenario: Archive instead of delete

- WHEN staff archives promotion `P`
- THEN its row and items are retained with `active = false`
- AND past combo sales keep `promotion_id = P`

#### Scenario: Create a bonus promotion

- WHEN staff submits a `bonus` promotion with one item (tariff, `bonus_sessions = 2`)
- THEN a `promotions` row (`active = true`) and one `promotion_items` row are created

## Test mapping

- Vitest unit: bonus-session math (`default + bonus`, override vs bono price),
  window predicate, combo payload builder (`source: "promotion"`).
- Integration (local Postgres): `kind` CHECK, `(promotion_id, tariff_id)`
  unique, `tariff_id` RESTRICT on delete, combo insert = 1 sale + N packages +
  N join rows with `client_package_id` null, single `sale_balances` entry,
  out-of-window rejection, archive retains items, RLS denial for non-staff.
