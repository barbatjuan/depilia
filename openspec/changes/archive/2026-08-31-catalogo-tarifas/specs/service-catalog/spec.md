# Service Catalog Specification (new capability: service-catalog)

Change: catalogo-tarifas. New full spec (no existing `service-catalog` spec).

## Purpose

Hold the clinic's real price list in the app: body zones (areas) plus
gendered, size-grouped tariffs that carry both a single-session price and a
6-session bono price. Give staff in-app management (create / edit / archive)
of tariffs and zones, and let selling be driven by the catalog instead of a
hand-typed price. Schema extends `package_templates` in place; `body_zones`
stays name-only.

## ADDED Requirements

### Requirement: Package template catalog shape

`package_templates` MUST gain `gender` (text, exactly `mujer` or `hombre`),
`size_category` (text, exactly one of `mini`, `pequena`, `mediana`, `grande`,
`cuerpo`), and `session_price` (numeric, `> 0`). The existing `price` column
MUST be renamed to `bono_price` and MUST be `> 0`. `default_sessions` MUST be
kept with a default of `6`. After backfill, `gender`, `size_category`,
`session_price`, and `bono_price` MUST all be `NOT NULL`. A
`UNIQUE (zone_id, gender)` constraint MUST exist so an area has at most one
tariff per gender.

#### Scenario: New tariff row rejects invalid enum

- GIVEN the migrated schema
- WHEN a row is inserted with `size_category = 'xl'` or `gender = 'unisex'`
- THEN a CHECK constraint rejects the insert

#### Scenario: Non-positive prices rejected

- WHEN a row is inserted with `session_price = 0` or `bono_price = -1`
- THEN a CHECK constraint rejects the insert

#### Scenario: One tariff per zone and gender

- GIVEN a `mujer` tariff already exists for zone `Axilas`
- WHEN a second `mujer` tariff is inserted for `Axilas`
- THEN the insert fails on `UNIQUE (zone_id, gender)`
- AND a `hombre` tariff for `Axilas` is still allowed

### Requirement: Pre-existing row backfill

The migration MUST backfill every `package_templates` row that exists before
it runs with `gender = 'mujer'`, `size_category = 'mediana'`, and
`session_price = round(bono_price / 6, 2)`, then apply the `NOT NULL`
constraints.

#### Scenario: Legacy row is backfilled

- GIVEN a pre-existing template with `price = 30000` and no gender
- WHEN migration `0012` runs
- THEN that row has `bono_price = 30000`, `gender = 'mujer'`, `size_category = 'mediana'`, `session_price = 5000.00`

### Requirement: Real catalog seeded idempotently

Migration `0012` MUST seed the real catalog: roughly 42 `body_zones` and
roughly 78 `package_templates` covering both `mujer` and `hombre` sheets from
the authoritative price list. Every seeded tariff MUST have
`default_sessions = 6` (every bono is 6 sessions). `Ingles Completas` MUST be
seeded `mujer`-only; `Perfilado de barba` MUST be seeded `hombre`-only. The
seed MUST be idempotent — re-running it MUST NOT create duplicates or error.

#### Scenario: Seed is idempotent

- GIVEN migration `0012` has already run once
- WHEN the same seed statements run again
- THEN no duplicate zones or tariffs are created (`on conflict do nothing`)
- AND no error is raised

#### Scenario: Gender-specific areas

- WHEN the catalog is seeded
- THEN `Ingles Completas` has a `mujer` tariff and no `hombre` tariff
- AND `Perfilado de barba` has a `hombre` tariff and no `mujer` tariff

#### Scenario: Every bono is six sessions

- WHEN the catalog is seeded
- THEN every seeded `package_templates` row has `default_sessions = 6`

### Requirement: Tariff management ABM

`/configuracion/tarifas` MUST let staff create, edit, and archive a tariff.
Archiving MUST set `active = false` and MUST NOT hard-delete. The list MUST
support filtering by `gender` and by `size_category`. A tariff card MUST
appear in `/configuracion`.

#### Scenario: Filter by gender and size

- GIVEN tariffs exist for both genders and several sizes
- WHEN staff filters the list by `gender = hombre` and `size_category = mediana`
- THEN only `hombre` `mediana` tariffs are listed

#### Scenario: Create a tariff

- WHEN staff submits a new tariff (zone, gender, size, session_price, bono_price)
- THEN a `package_templates` row is created with `active = true` and `default_sessions = 6`

#### Scenario: Archive instead of delete

- WHEN staff archives a tariff
- THEN its row is retained with `active = false` and it no longer appears in the default list

### Requirement: Zone management ABM

`/configuracion/zonas` MUST let staff create, edit, and archive a body zone
(name only). Archiving MUST set the zone's archived flag and MUST NOT
hard-delete.

#### Scenario: Create and archive a zone

- WHEN staff creates zone `Pómulos`
- THEN a `body_zones` row exists with that name
- WHEN staff archives it
- THEN it is retained but excluded from active zone pickers

### Requirement: Archived tariff leaves the sell picker without touching history

An archived (`active = false`) tariff MUST NOT appear in the sell flow's
tariff picker. Existing `client_packages` and `sales` rows that referenced it
MUST be unaffected; `client_packages.template_id` MUST be `ON DELETE SET NULL`
so deleting a template never blocks or rewrites a sale.

#### Scenario: Archived tariff hidden from selling

- GIVEN a client package was sold from tariff `T`
- WHEN `T` is archived
- THEN `T` no longer appears in the sell picker
- AND the existing `client_packages` row keeps its `total_sessions` and its `sales.total`

#### Scenario: Deleting a template nulls the link only

- GIVEN a `client_packages` row with `template_id = T`
- WHEN `T` is deleted
- THEN the `client_packages` row survives with `template_id = NULL` and unchanged sessions

### Requirement: Selling a bono

Selling a "paquete" MUST always create a `client_packages` row with
`total_sessions = default_sessions` (6) and a `sales` row with
`total = bono_price` of the chosen tariff.

#### Scenario: Bono sale

- GIVEN tariff `Medias piernas` `mujer` with `bono_price = 120`
- WHEN staff sells the paquete for a client
- THEN a `client_packages` row is created with `total_sessions = 6`
- AND a `sales` row is created with `total = 120`

### Requirement: Selling a loose session with a tariff-prefilled price

The loose single-session sale MUST let staff select a tariff (template); on
selection the amount field MUST be prefilled with that tariff's
`session_price`. The amount field MUST remain editable so the operator can
override the prefilled value before confirming.

#### Scenario: Prefill then keep

- GIVEN tariff `Axilas` `mujer` with `session_price = 10`
- WHEN staff picks it in the loose-session flow
- THEN the amount field shows `10`
- WHEN staff confirms without editing
- THEN the `sales.total` is `10`

#### Scenario: Operator override

- GIVEN the amount field is prefilled with `10`
- WHEN staff changes it to `8` and confirms
- THEN the `sales.total` is `8`

### Requirement: Staff-only catalog access

The `is_staff()` RLS already on `package_templates` and `body_zones` MUST
continue to govern the new columns and seeded rows: a non-staff authenticated
user MUST NOT read or write tariffs or zones.

#### Scenario: Non-staff denied

- GIVEN an authenticated user with no `staff` row
- WHEN they query `package_templates` or `body_zones`
- THEN RLS returns zero rows and writes are rejected

## Test mapping

- Vitest unit (pure domain): `buildPackageSalePayload` maps `bono_price` →
  `sales.total` and `default_sessions` (6) → `total_sessions`; loose-session
  payload builder prefills and honours an overridden `session_price`; gender /
  size filter predicate for the picker.
- Integration (real local Postgres): enum + positive-price CHECKs,
  `UNIQUE (zone_id, gender)`, `NOT NULL` after backfill, backfill values,
  `0012` seed idempotency (re-run = no duplicates), gender-specific area
  seeding, `template_id` SET NULL on delete, RLS denial for non-staff.
- E2E golden path: existing spec passes on the migrated schema; selling the
  golden-path package still yields a 6-session `client_packages` row.
