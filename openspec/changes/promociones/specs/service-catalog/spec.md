# Delta for Service Catalog

Change: promociones. Extends the two selling requirements to accept an optional
discount (manual or code) on both flows and an optional combo/bonus promotion
on Vender paquete. Money-model columns and validation are defined by the
`sale-discounts`, `discount-codes`, and `promotions` capabilities.

## MODIFIED Requirements

### Requirement: Selling a bono

Selling a "paquete" MUST create `client_packages` row(s) and a `sales` row.
Without a promotion or discount it MUST create one `client_packages` row with
`total_sessions = default_sessions` (6) and a `sales` row with
`total = list_total = bono_price` of the chosen tariff and `discount_amount = 0`.

Selling a bono MAY additionally accept:
- an optional manual discount (`percent` or `fixed`) OR an optional discount
  code, never both; when applied, `sales.list_total` holds the pre-discount
  price, `discount_amount > 0`, `total = list_total - discount_amount`,
  `total >= 0.01`, `discount_reason` is required for a manual discount, and
  `discounted_by` is the acting staff member;
- an optional `combo` or `bonus` promotion. A `bonus` promotion sets
  `client_packages.total_sessions = default_sessions + bonus_sessions` and
  `list_total = override_price` or `bono_price`. A `combo` promotion writes one
  `sales` row (`client_package_id` NULL, `promotion_id` set) with N
  `client_packages` rows linked via `sale_packages`, and one payment plan.

(Previously: selling a bono always created exactly one `client_packages` row
with `total_sessions = 6` and a `sales` row with `total = bono_price`, with no
discount or promotion concept.)

#### Scenario: Bono sale

- GIVEN tariff `Medias piernas` `mujer` with `bono_price = 120`
- WHEN staff sells the paquete for a client with no discount or promotion
- THEN a `client_packages` row is created with `total_sessions = 6`
- AND a `sales` row is created with `list_total = 120`, `discount_amount = 0`, `total = 120`

#### Scenario: Bono sale with a manual discount

- GIVEN tariff with `bono_price = 120`
- WHEN staff sells it applying a `10%` discount with reason "fidelidad"
- THEN the `sales` row has `list_total = 120`, `discount_amount = 12`, `total = 108`, `discount_reason = 'fidelidad'`, `discounted_by` set

#### Scenario: Bono sale with a discount code

- GIVEN active in-window code `VERANO` = `fixed 20`, not exhausted
- WHEN staff sells a `bono_price = 120` paquete applying `VERANO`
- THEN the `sales` row has `discount_code_id` set, `discount_amount = 20`, `total = 100`
- AND the code's `used_count` is incremented by 1

#### Scenario: Combo sale

- GIVEN combo promotion `P` with items for tariffs `T1`, `T2`
- WHEN staff sells `P` for a client
- THEN exactly one `sales` row is created with `promotion_id = P` and `client_package_id IS NULL`
- AND two `client_packages` rows are linked to it via `sale_packages`

#### Scenario: Bonus "6+2" sale

- GIVEN tariff `T` `default_sessions = 6`, `bono_price = 120`, bonus promotion item `bonus_sessions = 2`
- WHEN staff sells the bonus
- THEN the `client_packages` row has `total_sessions = 8` and `sales.total = 120`

#### Scenario: Code and manual discount rejected together

- WHEN staff applies both a discount code and a manual discount to one bono sale
- THEN checkout rejects the sale in Spanish and nothing is written

### Requirement: Selling a loose session with a tariff-prefilled price

The loose single-session sale MUST let staff select a tariff (template); on
selection the amount field MUST be prefilled with that tariff's
`session_price`. The amount field MUST remain editable so the operator can
override the prefilled value before confirming.

The loose-session sale MAY additionally accept an optional manual discount
(`percent` or `fixed`) OR an optional discount code, never both. When applied,
the (possibly overridden) amount is `sales.list_total`, `discount_amount > 0`,
`total = list_total - discount_amount`, `total >= 0.01`, `discount_reason` is
required for a manual discount, and `discounted_by` is recorded. A combo or
bonus promotion MUST NOT be offered on this flow.

(Previously: the loose-session sale had no discount or code input; `sales.total`
was simply the prefilled-or-overridden amount.)

#### Scenario: Prefill then keep

- GIVEN tariff `Axilas` `mujer` with `session_price = 10`
- WHEN staff picks it in the loose-session flow
- THEN the amount field shows `10`
- WHEN staff confirms without editing and without a discount
- THEN the `sales` row has `list_total = 10`, `discount_amount = 0`, `total = 10`

#### Scenario: Operator override

- GIVEN the amount field is prefilled with `10`
- WHEN staff changes it to `8` and confirms with no discount
- THEN the `sales` row has `list_total = 8`, `total = 8`

#### Scenario: Loose session with a discount

- GIVEN prefilled amount `20`
- WHEN staff applies a `fixed 5` discount with reason "cliente frecuente"
- THEN the `sales` row has `list_total = 20`, `discount_amount = 5`, `total = 15`, `discount_reason` set, `discounted_by` set

#### Scenario: No promotion picker on loose session

- WHEN staff opens the Sesión suelta form
- THEN there is no combo/bonus promotion selector

## Test mapping

- Vitest unit: `buildPackageSalePayload` / loose-session payload builders carry
  `listTotal`, `discountAmount`, `discountReason`, `promotionId?`,
  `discountCodeId?`; combo payload emits `source: "promotion"`.
- Integration: bono sale with manual discount, with code (used_count++), combo
  (1 sale + N packages), bonus 6+2, code+manual rejected, loose session with
  discount, no promotion on loose session.
- E2E golden path: unchanged bono sale still yields a 6-session package and a
  clean money snapshot.
