# Design: promociones (combos, per-sale discounts, discount codes)

File copy of Engram `sdd/promociones/design` (hybrid store). Base:
feature-branch-chain off `c664ecb`. NEVER `main`. Locked decisions: Engram
#148. Proposal: Engram #149 / `openspec/changes/promociones/proposal.md`.

Size-budget note: this design exceeds the skill's 800-word guidance, following
the `caja-diaria` (#116) and `catalogo-tarifas` precedents and the
orchestrator's explicit request for full DDL sketches, a per-slice call-site
table, and module contracts.

## Technical Approach

Postgres owns every money and usage invariant, exactly as
`payments_reject_overpayment` (0006) and the caja triggers (0011) do. One
additive migration `0015` adds the `sales` money model, four catalog/junction
tables, two triggers, and one combo RPC. All display math that a human can see
before the row is written lives in a pure, unit-tested
`src/features/promotions/domain/discount.ts`; the DB trigger is the only
authority for code exhaustion under concurrency. `sale_balances`,
`deriveSaleBalance`, caja/arqueo, and the dashboard KPI are payment-driven and
are not touched — a discount only lowers `sales.total`, which is already the
payment cap.

Four concerns fail differently and are sliced apart: **schema** (`0015`, a
backfill + NOT NULL that must run on a zero-row prod table), **per-sale
discount** (pure math + both sell forms + `sales` insert), **codes** (a
race-prone counter guarded by a `FOR UPDATE` trigger), **combos** (one sale /
N packages / N join rows, the one place the 2-insert MVP tradeoff genuinely
breaks down), and **two ABMs** that mirror `src/features/settings/` tarifas
near-verbatim.

## Architecture Decisions

| # | Decision | Chose | Rejected | Rationale |
|---|---|---|---|---|
| 1 | Combo persistence | **A dedicated `public.create_combo_sale(...)` RPC** in `0015`, wrapping the one `sales` + N `client_packages` + N `sale_packages` inserts in one transaction | Extend the existing non-transactional 2-insert JS path (proposal's stated follow-up posture) | The single-package path is `client_packages` then `sales`; a failed 2nd insert leaves an orphan package that no code reads. A combo is `1 + 2N` inserts and a partial failure leaves a `sales` row with `client_package_id IS NULL` and *some* `sale_packages` links — indistinguishable from a valid combo in every list/detail view, and it already counts against `sale_balances`. The code-usage trigger also fires on that `sales` insert, so a JS retry would double-increment `used_count`. An RPC is ~35 SQL lines, removes all JS orchestration, and gives the combo a single failure atom. The non-combo path stays 2-insert, unchanged (proposal scope). |
| 2 | Discount math location | Pure `domain/discount.ts`, caller passes `fractionDigits` | `discount.ts` reads `clinic_settings` | Keeps it I/O-free and unit-testable per the `sale-discounts` spec. Fraction digits come from `getMoneyFormat()` (already request-cached) via a pure `currencyFractionDigits(currency)` helper. |
| 3 | 100% discount | `applyDiscount` **rejects** (`{ ok: false, reason: "exceeds" }`) when `discountAmount > listTotal - 0.01`; negatives clamp to `0` | A `CHECK (discount_amount < list_total)` | A CHECK gives a raw `23514`; the spec wants a distinct Spanish message and "no `sales` row written". The existing `total > 0` CHECK (numeric(12,2) ⇒ `>= 0.01`) is the DB backstop. |
| 4 | Code-usage guard | **BEFORE INSERT ON `sales`** trigger: `SELECT … FOR UPDATE` the code, re-check active/window/exhaustion, `used_count++` | `used_count++` in the action after the insert | Identical reasoning to `payments_reject_overpayment`: two concurrent 2-insert sales would both read a stale `used_count` and both pass. The lock serialises them. |
| 5 | Void decrement | **AFTER UPDATE ON `sales`** trigger, fires only on `old.status <> 'void' AND new.status = 'void' AND discount_code_id IS NOT NULL`; `used_count = greatest(used_count - 1, 0)` | BEFORE UPDATE (caja precedent) | The decrement writes a *different* table, so AFTER is correct and cheaper; no need to mutate `NEW`. |
| 6 | Code date window | Plain `date` columns, compared to `(now() AT TIME ZONE 'America/Argentina/Buenos_Aires')::date` in the trigger; evaluated at insert only | `tstzrange`; re-check on sale edit | OQ7. Matches the literal BA zone used verbatim in 0011. Sale edits never re-run the BEFORE INSERT trigger, so "not re-checked on edit" is structural. |
| 7 | `sale_packages` shape | `sale_id` FK `sales` `ON DELETE CASCADE`; `client_package_id` FK `client_packages` `ON DELETE RESTRICT` **`UNIQUE`** | `ON DELETE CASCADE` on the package side | A combo sale is the owner of its lines (cascade on delete), but a `client_packages` row must never vanish from under a sale — `RESTRICT` mirrors `sales.client_package_id`. `UNIQUE(client_package_id)` keeps the 1-package-1-sale invariant the old 1:1 column gave. |
| 8 | Two ABMs | `src/features/promotions/` and `src/features/discount-codes/` as **separate feature dirs**, each mirroring `src/features/settings/` tarifas file-for-file; sibling routes `/configuracion/promociones/**` and `/configuracion/codigos/**`; two `/configuracion` Cards; `nav-items.ts` unchanged | A tab UI on one route | OQ8. Independent slices (P5, P6), independent rollback, independent review budget. |
| 9 | Combo `list_total` | Sum of each item's `override_price ?? tariff.bono_price`, computed in the action and passed to the RPC; a further optional discount (code or manual) applies on top | Per-line discount | One sale, one balance (OQ2). The RPC receives final `list_total` / `discount_amount` / `discount_code_id`. |

## Migration `0015_promotions.sql` (ordered)

```sql
-- 1. New catalog + junction tables FIRST (sales FKs reference them).
create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('combo','bonus')),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table promotion_items (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  tariff_id uuid not null references package_templates (id) on delete restrict,
  bonus_sessions int not null default 0 check (bonus_sessions >= 0),
  override_price numeric(12,2) check (override_price > 0)
);
create unique index promotion_items_promotion_tariff_idx
  on promotion_items (promotion_id, tariff_id);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code citext not null,                       -- citext from 0001
  kind text not null check (kind in ('percent','fixed')),
  value numeric(12,2) not null check (value > 0),
  max_uses int check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint discount_codes_within_cap
    check (max_uses is null or used_count <= max_uses)
);
create unique index discount_codes_code_active_idx
  on discount_codes (lower(code)) where active;

-- 2. sales money model — add nullable, backfill, lock, constrain.
alter table sales
  add column list_total       numeric(12,2),
  add column discount_amount  numeric(12,2) not null default 0
        check (discount_amount >= 0),
  add column discount_reason  text,
  add column promotion_id     uuid references promotions (id)      on delete set null,
  add column discount_code_id uuid references discount_codes (id)  on delete set null,
  add column discounted_by    uuid references staff (id)           on delete set null;

update sales set list_total = total where list_total is null;

alter table sales
  alter column list_total set not null,
  add constraint sales_money_identity
    check (total = list_total - discount_amount);
-- existing `total > 0` CHECK stays: numeric(12,2) + > 0 ⇒ total >= 0.01.

-- 3. combo junction (after sales exists).
create table sale_packages (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  client_package_id uuid not null unique
    references client_packages (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index sale_packages_sale_id_idx on sale_packages (sale_id);

-- 4. RLS — is_staff() policy verbatim (0002) on every new table.
alter table promotions     enable row level security;
alter table promotion_items enable row level security;
alter table discount_codes  enable row level security;
alter table sale_packages   enable row level security;
create policy "promotions_staff_all" on promotions
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "promotion_items_staff_all" on promotion_items
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "discount_codes_staff_all" on discount_codes
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "sale_packages_staff_all" on sale_packages
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- 5. Atomic code-usage guard (mirrors payments_reject_overpayment).
create function public.sales_apply_discount_code()
returns trigger language plpgsql security definer set search_path = public as $$
declare c discount_codes%rowtype;
        v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if new.discount_code_id is null then return new; end if;
  select * into c from discount_codes where id = new.discount_code_id for update;
  if not c.active then
    raise exception 'discount_code_inactive: %', c.code using errcode = 'check_violation';
  end if;
  if (c.valid_from is not null and v_today < c.valid_from)
     or (c.valid_to is not null and v_today > c.valid_to) then
    raise exception 'discount_code_out_of_window: %', c.code using errcode = 'check_violation';
  end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then
    raise exception 'discount_code_exhausted: %', c.code using errcode = 'check_violation';
  end if;
  update discount_codes set used_count = used_count + 1 where id = c.id;
  return new;
end $$;
create trigger sales_apply_discount_code_trg
  before insert on sales for each row execute function public.sales_apply_discount_code();

-- 6. Void returns the use.
create function public.sales_release_discount_code()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if old.status <> 'void' and new.status = 'void'
     and new.discount_code_id is not null then
    update discount_codes set used_count = greatest(used_count - 1, 0)
      where id = new.discount_code_id;
  end if;
  return new;
end $$;
create trigger sales_release_discount_code_trg
  after update on sales for each row execute function public.sales_release_discount_code();

-- 7. Combo sale RPC — one transaction for 1 sale + N packages + N join rows.
create function public.create_combo_sale(
  p_client_id uuid, p_promotion_id uuid, p_description text,
  p_list_total numeric, p_discount_amount numeric, p_discount_reason text,
  p_discount_code_id uuid, p_discounted_by uuid,
  p_lines jsonb   -- [{ tariff_id, zone_id, total_sessions }]
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_sale_id uuid; v_pkg_id uuid; ln jsonb;
begin
  insert into sales (client_id, description, total, list_total, discount_amount,
                     discount_reason, promotion_id, discount_code_id, discounted_by)
  values (p_client_id, p_description, p_list_total - p_discount_amount, p_list_total,
          p_discount_amount, p_discount_reason, p_promotion_id, p_discount_code_id,
          p_discounted_by)
  returning id into v_sale_id;
  for ln in select * from jsonb_array_elements(p_lines) loop
    insert into client_packages (client_id, template_id, zone_id, total_sessions)
    values (p_client_id, (ln->>'tariff_id')::uuid, (ln->>'zone_id')::uuid,
            (ln->>'total_sessions')::int)
    returning id into v_pkg_id;
    insert into sale_packages (sale_id, client_package_id) values (v_sale_id, v_pkg_id);
  end loop;
  return v_sale_id;
end $$;

-- 8. Extend the dev-only truncate_table allow-list (last redefined 0011).
create or replace function public.truncate_table(table_name text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if table_name not in (
    'staff','clients','body_zones','package_templates','client_packages',
    'appointments','sales','payments','expense_categories','expenses',
    'reminder_log','clinic_settings','cash_sessions','cash_movements',
    'promotions','promotion_items','discount_codes','sale_packages'
  ) then
    raise exception 'truncate_table: % is not an allowed table', table_name;
  end if;
  execute format('truncate table %I restart identity cascade', table_name);
end $$;
```

Down migration reverses 7→1: drop RPC, both triggers + functions, `sale_packages`,
`sales` constraints + 6 columns, `discount_codes`, `promotion_items`,
`promotions`, restore the 0011 `truncate_table` body. Safe on zero prod sales.

## Pure domain module — `src/features/promotions/domain/discount.ts`

```ts
export type DiscountKind = "percent" | "fixed";
export type DiscountInput = {
  listTotal: number;
  kind: DiscountKind;
  value: number;          // percent points, or a fixed currency amount
  fractionDigits: number; // from currencyFractionDigits(clinic currency)
};
export type DiscountResult =
  | { ok: true; total: number; discountAmount: number }
  | { ok: false; reason: "exceeds" | "invalid" };

/** Pure. No I/O. `sale-discounts` spec: round percent to currency digits,
 *  fixed verbatim, clamp negatives to 0, reject when total would be < 0.01. */
export function applyDiscount(input: DiscountInput): DiscountResult;

/** Pure. `Intl.NumberFormat(..., { style:"currency", currency })
 *  .resolvedOptions().maximumFractionDigits`. EUR → 2. */
export function currencyFractionDigits(currency: string): number;

/** Pure. bonus-session math (`promotions` spec). */
export function bonusSessions(defaultSessions: number, bonusSessions: number): number;
export function bonusPrice(bonoPrice: number, overridePrice: number | null): number;
```

`applyDiscount` rules: `raw = kind === "percent" ? round(listTotal * value/100, fractionDigits) : value`;
`discountAmount = max(0, raw)`; if `discountAmount > listTotal - 0.01` → `{ ok: false, reason: "exceeds" }`;
else `{ ok: true, discountAmount, total: round(listTotal - discountAmount, fractionDigits) }`.

## Data-layer contracts

### Combo sell path — RPC (decision 1)

```ts
// src/features/packages/data/sell-package.ts  (extended)
export async function sellCombo(supabase, params: {
  clientId: string; promotionId: string; description: string;
  listTotal: number; discountAmount: number; discountReason: string | null;
  discountCodeId: string | null; discountedBy: string | null;
  lines: { tariffId: string; zoneId: string; totalSessions: number }[];
}): Promise<{ saleId: string }>;
//  → supabase.rpc("create_combo_sale", { p_client_id: …, p_lines: lines })

// sellPackage / sellLooseSession: same 2-insert / 1-insert shape, the `sales`
// insert now also writes list_total, discount_amount, discount_reason,
// promotion_id (bonus), discount_code_id, discounted_by.
```

### `sale_packages` columns

`id uuid pk`, `sale_id uuid → sales ON DELETE CASCADE`,
`client_package_id uuid UNIQUE → client_packages ON DELETE RESTRICT`,
`created_at timestamptz`.

### `validateDiscountCode` at checkout

```ts
// src/features/discount-codes/data/discount-codes.ts
export type CodeRejection = "unknown" | "inactive" | "out_of_window" | "exhausted";
export async function validateDiscountCode(
  supabase, code: string, businessDate: string,
): Promise<
  | { ok: true; row: { id: string; kind: DiscountKind; value: number } }
  | { ok: false; reason: CodeRejection }
>;
//  advisory pre-check for form UX and to resolve kind/value; the BEFORE INSERT
//  trigger is the real guard and re-validates under FOR UPDATE.
```

### ABM data fns (mirror `src/features/settings/data/tarifas.ts`)

```ts
// promotions/data/promotions.ts
listPromotions(s, { kind?, includeArchived? }): Promise<PromotionRow[]>   // joins promotion_items
getPromotion(s, id); createPromotion(s, input);   // insert promotions + N promotion_items
updatePromotion(s, id, input);                    // replace items set
archivePromotion(s, id);  restorePromotion(s, id); // active flag; NO delete

// discount-codes/data/discount-codes.ts
listDiscountCodes(s, { includeArchived? }); getDiscountCode(s, id);
createDiscountCode(s, input); updateDiscountCode(s, id, input);   // not code/kind after use
archiveDiscountCode(s, id); restoreDiscountCode(s, id);           // 23505 on active collision
```

Error mappers mirror `domain/tarifa-errors.ts`: `mapPromotionError` (`23505` dup
tariff, `23503` RESTRICT), `mapDiscountCodeError` (`23505` active dup, `23514`
cap), and `mapDiscountError` parsing the trigger message prefixes
(`discount_code_inactive` → "El código no está activo.",
`discount_code_out_of_window` → "El código está fuera de vigencia.",
`discount_code_exhausted` → "El código ya alcanzó su límite de usos.").

## Full call-site table

| File | Action | Slice(s) | Change |
|---|---|---|---|
| `supabase/migrations/0015_promotions.sql` | Create | P1 | DDL above |
| `src/lib/supabase/types.ts` | Regen (generated, excluded) | P1 | after `0015` |
| `tests/integration/helpers/fixtures.ts` | Modify | P1 | `seedSale` new cols; `seedPromotion`, `seedDiscountCode` helpers |
| `tests/integration/*promotions*.test.ts` | Create | P1 | CHECK, backfill, RLS, usage race, window, void decrement, combo RPC |
| `src/features/promotions/domain/discount.ts` | Create | P2 | `applyDiscount`, `currencyFractionDigits`, `bonus*` |
| `tests/unit/features/promotions/discount.test.ts` | Create | P2 | percent rounding, fixed verbatim, clamp, exceeds-reject |
| `src/features/settings/data/money-format.ts` | reuse | P2 | `getMoneyFormat` → `currencyFractionDigits` |
| `src/features/packages/domain/sell-package.ts` | Modify | P2, P4 | payloads carry `listTotal/discountAmount/discountReason/promotionId?/discountCodeId?/discountedBy?`; `PackageSaleRequest` gains `source: "promotion"` |
| `src/features/packages/data/sell-package.ts` | Modify | P2, P4 | `sales` insert writes new cols; add `sellCombo` (RPC) |
| `src/features/packages/schema.ts` | Modify | P2, P3, P4 | `sellPackageSchema` / `sellLooseSessionSchema` + `discountKind`, `discountValue`, `discountReason`, `discountCode`, `promotionId` (package only); `superRefine`: code XOR manual → "No se pueden combinar un código y un descuento manual."; manual discount ⇒ reason required |
| `src/features/packages/actions/sell-package.ts` | Modify | P2, P3, P4 | resolve `getMoneyFormat`; `applyDiscount`; resolve code via `validateDiscountCode`; `discounted_by` = `current_staff_id` (read staff); branch `source: "promotion"` → `sellCombo`; map trigger errors |
| `src/features/packages/actions/sell-loose-session.ts` | Modify | P2, P3 | same, minus promotions |
| `src/features/packages/components/sell-package-form.tsx` | Modify | P2, P3, P4 | discount block (kind toggle + amount + reason) and code input, **mutually exclusive** (entering a code disables the manual fields and vice-versa); combo/bonus `<Select>` above tariff picker, populated from `listActivePromotions` |
| `src/features/packages/components/sell-loose-session-form.tsx` | Modify | P2, P3 | discount block + code input, mutually exclusive; NO promotion picker |
| `src/features/packages/components/package-sale-actions.tsx` | Modify | P2, P4 | pass `promotions` + `moneyFormat` to both sheets |
| `src/features/packages/data/package-templates.ts` | reuse | P4 | `listActivePromotions` join for the picker (or new `promotions/data`) |
| `src/features/sales/data/sales.ts` | Modify | P2 | `SELECT` adds `list_total, discount_amount, discount_reason, promotions(name), discount_codes(code)`; `SaleListRow` / `SaleDetail` gain `listTotal`, `discountAmount`, `promoLabel` |
| `src/features/sales/components/columns.tsx` | Modify | P2 | "Total" cell shows struck `listTotal` + `total` when `discountAmount > 0` |
| `src/app/(dashboard)/ventas/[id]/page.tsx` | Modify | P2 | Resumen card adds "Precio de lista" (struck) + "Descuento" + promo/code label rows |
| `src/features/promotions/**` (data, schema, `domain/promotion-errors.ts`, actions ×3, components ×4) | Create | P5 | mirror `src/features/settings/` tarifas |
| `src/app/(dashboard)/configuracion/promociones/{page,nueva/page,[id]/editar/page}.tsx` | Create | P5 | list reads `?kind=&archived=` |
| `src/features/discount-codes/**` (data, schema, `domain/discount-code-errors.ts` + `discount-error.ts`, actions ×3, components ×4) | Create | P3 data / P6 ABM | `data/` + `domain/discount-error.ts` land in P3 (checkout needs them); ABM shell in P6 |
| `src/app/(dashboard)/configuracion/codigos/{page,nueva/page,[id]/editar/page}.tsx` | Create | P6 | list reads `?archived=` |
| `src/app/(dashboard)/configuracion/page.tsx` | Modify | P5, P6 | one Card each |
| `src/components/nav-items.ts` | unchanged | — | both ABMs under existing `/configuracion` |
| `tests/integration/sell-package.test.ts` | Modify | P2, P3, P4 | new columns; discount / code / combo / bonus cases |
| `e2e/global-setup.ts`, `scripts/seed-demo.mjs` | Modify (optional) | P3/P4 | demo promo + code |
| `e2e/golden-path.spec.ts` | reuse | P2 | unchanged bono sale still yields clean snapshot |

## 6-slice mapping (Feature Branch Chain off `c664ecb`, tracker `promociones`)

| # | Branch | Targets | Files | ~Lines | Budget |
|---|---|---|---|---:|---|
| P1 | `promociones-pr1-migration` | `promociones` | `0015_promotions.sql`; `types.ts` regen; `fixtures.ts`; integration tests (CHECK/backfill/RLS/usage-race/window/void/combo-RPC) | 320 | HIGH |
| P2 | `promociones-pr2-sale-discount` | P1 | `domain/discount.ts` + unit; `sell-package.ts` domain+data; `packages/schema.ts` superRefine; both sell forms (discount block, mutually exclusive); `package-sale-actions.tsx`; both actions (`discounted_by`); `sales.ts` + `columns.tsx` + `ventas/[id]` display; unit + integration | 360 | MED |
| P3 | `promociones-pr3-codes-checkout` | P2 | `discount-codes/data/discount-codes.ts` (`validateDiscountCode`); `discount-codes/domain/discount-error.ts`; code input on both forms + XOR guard; both actions resolve+map; usage + void integration | 300 | MED |
| P4 | `promociones-pr4-combos-sell` | P3 | `source:"promotion"` payload variant; `sellCombo` RPC wrapper; bonus math; combo/bonus picker in `sell-package-form.tsx`; unit + integration (join, single balance, bonus 6+2) | 380 | HIGH |
| P5 | `promociones-pr5-promociones-abm` | P4 | `src/features/promotions/**` + 3 routes + form/list/columns/archive + error mapper + `/configuracion` Card + unit | 370 | MED |
| P6 | `promociones-pr6-codigos-abm` | P5 | `src/features/discount-codes/**` ABM shell (form/list/columns/archive) + 3 routes + `/configuracion` Card + unit | 320 | LOW |

**Pre-authorized P4a/P4b split** — trigger: if `sdd-tasks` forecasts P4 authored
lines > 400 (or budget stays HIGH after task breakdown).
- **P4a** `promociones-pr4a-bonus` (targets P3): `source:"promotion"` payload +
  `bonusSessions`/`bonusPrice` wiring + single-zone bonus sell path (still the
  2-insert path, `promotion_id` on the sale) + bonus picker + bonus unit/integration. ~210.
- **P4b** `promociones-pr4b-combo` (targets P4a): `sellCombo` RPC wrapper +
  multi-item combo picker + combo integration (1 sale / N packages / N join rows /
  single `sale_balances`). ~200. P5 then targets P4b.

## Testing Strategy

| Layer | What | How |
|---|---|---|
| Unit | `applyDiscount` (percent→currency digits, fixed verbatim, negative clamp, `exceeds` at 100% and at `listTotal-0.005`), `currencyFractionDigits`, `bonusSessions`/`bonusPrice`, code-rejection predicate, Spanish error mappers, combo payload builder | Vitest node, pure, no mocks |
| Integration | backfill + `NOT NULL`; `sales_money_identity` + `discount_amount >= 0` + `total > 0`; `promotion_items` `(promotion_id,tariff_id)` unique + `tariff_id` RESTRICT; `discount_codes` `lower(code) where active` unique + cap CHECK; trigger increment; **concurrent inserts exactly-one**; out-of-window / exhausted / inactive rejection; void decrement + floor 0; `create_combo_sale` = 1 sale (`client_package_id IS NULL`) + N packages + N join rows + single `sale_balances`; RLS denial for non-staff on all 4 tables; `sale_balances` / caja theoretical unchanged by a discount | Vitest vs local `supabase start`, `describe.sequential`, truncate between specs |
| E2E | existing golden path green on migrated schema (no-discount bono → clean snapshot) | Playwright, seeded local stack |

Strict TDD: a failing test precedes every task. SQL guarantees are tested
against real Postgres, never mocked.

## Threat Matrix

N/A — no routing, shell commands, subprocesses, VCS/PR automation,
executable-file classification, or process-integration boundary.
`/configuracion/promociones` and `/configuracion/codigos` are app routes.
`create_combo_sale` is a `SECURITY DEFINER` SQL function reached only through
PostgREST `rpc()` under `is_staff()` RLS; its inputs are typed and it performs
no dynamic SQL except `format('truncate … %I')` in the unchanged dev-only
`truncate_table`. RLS + trigger guarantees are covered by integration denial
and race tests.

## Migration / Rollout

One additive migration, no data migration (prod has zero `sales` rows). Rollback
per slice in reverse (P6→P1), each slice autonomous — see proposal's Rollback
Plan. `0015` down migration is section-7-to-1 reversed and is safe while the
chain is unpushed.

## Decisions vs rejected alternatives — summary

See the Architecture Decisions table. The load-bearing ones: **(1)** a combo
RPC instead of extending the non-transactional JS path; **(3)** app-layer
rejection of a 100% discount rather than a `CHECK (discount_amount <
list_total)`; **(4/5)** the usage counter guarded entirely by DB triggers;
**(7)** `sale_packages.client_package_id UNIQUE` + `RESTRICT` to preserve the
old 1:1 invariant.

## Deviations from the proposal

1. **Combo persistence uses a dedicated `create_combo_sale` RPC** (decision 1).
   The proposal listed "RPC/transactional wrapping" as out of scope and a
   follow-up. This design scopes an RPC to the *combo path only* (the
   single-package 2-insert path is unchanged) because a partial combo write is
   materially worse than an orphan `client_packages` row and would corrupt
   `used_count`. The RPC ships in `0015` (P1); P4 only wires it.
2. **`max_uses` CHECK is `> 0`** (not just `int`) — a `0`-use code is a data
   error, not a valid "disabled" state (use `active`).
3. **`promotion_items.override_price` carries its own `> 0` CHECK** — the
   exploration's Shape C left it unconstrained.
4. **P3 carries `discount-codes/data/` + `domain/discount-error.ts`**, not just
   P6. Checkout validation (P3) needs them; the P6 slice is the ABM shell only.
5. **Bonus sell path stays 2-insert** (only combos get the RPC) — a bonus is one
   `client_packages` row, no fan-out, so the existing tradeoff still holds.

## Open Questions

- [ ] Can a `combo`/`bonus` promotion also carry a discount code or manual
      discount on the same sale? This design allows it (schema + RPC accept
      `discount_*` params uniformly; only code-XOR-manual is forbidden).
      Confirm that is desired, or restrict promotions to list price only.
- [ ] `updateDiscountCode` after `used_count > 0`: lock `code`/`kind`/`value`
      (history integrity) or allow edits? This design locks them; only
      `max_uses` / `valid_to` / `active` stay editable.
- [ ] `updatePromotion` item editing: full replace of the item set vs
      add/remove diffing. Full replace is simpler and proposed; confirm no
      `promotion_items.id` is referenced elsewhere (it is not today).
