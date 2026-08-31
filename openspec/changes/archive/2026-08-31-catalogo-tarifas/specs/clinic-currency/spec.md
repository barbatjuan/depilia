# Clinic Currency Specification (new capability: clinic-currency)

Change: catalogo-tarifas. New full spec (no existing `clinic-currency` spec).

## Purpose

Give the clinic a single configured currency and locale that governs every
money value the app displays. Replace the scattered hardcoded `es-AR` / `ARS`
formatters with one shared money-format module so currency is a setting, not
a constant.

## ADDED Requirements

### Requirement: Clinic currency setting

`clinic_settings` MUST gain a `currency` column holding an ISO 4217 code,
defaulting to `'EUR'`, and a locale value used for number/currency
formatting. The row MUST always resolve to a currency and locale (no null
money formatting context).

#### Scenario: Default currency

- GIVEN a fresh `clinic_settings` row with no explicit currency
- WHEN it is read
- THEN `currency = 'EUR'` and a usable formatting locale is present

#### Scenario: Currency is configurable

- WHEN staff sets `currency` to another ISO code
- THEN the stored value is that code and it is used for all later formatting

### Requirement: Single shared money formatter

A shared money-format module MUST be the only code path that formats a
monetary amount for display. After this change no component, page, action,
or helper MUST format money with a hardcoded locale or currency; every money
string MUST come from the shared module reading the clinic setting.

#### Scenario: One formatter

- WHEN money is rendered anywhere in the app
- THEN the formatted string is produced by the shared money module
- AND no call site passes a literal `'es-AR'` / `'ARS'` (or any other hardcoded currency/locale)

#### Scenario: Unit-testable in isolation

- GIVEN the shared module and an explicit currency + locale
- WHEN an amount is formatted
- THEN the output is deterministic for that currency + locale pair

### Requirement: Currency setting governs every money surface

The configured currency MUST govern money display on every surface,
specifically: dashboard KPIs, the ventas list and ventas detail, the caja
theoretical balance and arqueo, and gastos.

#### Scenario: All surfaces use the setting

- GIVEN `currency = 'EUR'`
- WHEN staff views dashboard KPIs, a venta detail, the caja arqueo, and a gasto
- THEN every money value on those surfaces is formatted in EUR

### Requirement: Changing the currency updates all displays

Changing the `clinic_settings` currency MUST change the formatting of every
money value across all surfaces on the next render; stored amounts are
unchanged (no conversion).

#### Scenario: Switch currency

- GIVEN money is displayed in EUR and a venta shows `total = 120`
- WHEN staff changes `currency` to a different ISO code
- THEN the same `120` renders formatted in the new currency on every surface
- AND the underlying `sales.total` value is still `120`

### Requirement: Deterministic currency for the E2E golden path

The default clinic currency is `'EUR'`. The E2E harness MUST NOT rely on that
default implicitly: `e2e/global-setup.ts` MUST explicitly seed the currency
and locale that the golden-path assertions expect, and the golden path MUST
assert money formatting for that explicitly seeded currency.

#### Scenario: Global setup seeds currency explicitly

- WHEN `e2e/global-setup.ts` runs
- THEN it writes a known `currency` and locale to `clinic_settings`
- AND the golden-path money assertions check formatting for exactly that seeded currency (not a hardcoded `$` / `ARS`)

### Requirement: Staff-only settings access

`clinic_settings` MUST be readable/writable only by staff via `is_staff()`
RLS; a non-staff authenticated user MUST NOT read or change the currency.

#### Scenario: Non-staff denied

- GIVEN an authenticated user with no `staff` row
- WHEN they query or update `clinic_settings`
- THEN RLS returns zero rows and the write is rejected

## Test mapping

- Vitest unit: shared money module formats deterministically per
  (currency, locale) with no hardcoded fallback; grep-style guard
  test asserting no `Intl.NumberFormat('es-AR'...)` / `'ARS'` literals remain
  at money call sites.
- Integration (real local Postgres): `clinic_settings.currency` default
  `'EUR'`, update persists, RLS denial for non-staff.
- E2E golden path: `global-setup` seeds a deterministic currency; the
  existing golden-path assertions are updated to that currency and pass.
