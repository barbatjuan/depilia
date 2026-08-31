-- Promotions, per-sale discounts and discount codes. Additive migration.
--
-- Postgres owns every money and usage invariant here, exactly as
-- payments_reject_overpayment (0006) and the caja triggers (0011) do:
--   * sales_money_identity CHECK  -> total is always list_total - discount_amount
--   * sales_apply_discount_code   -> BEFORE INSERT, FOR UPDATE lock on the code
--                                    row, re-checks active/window/exhaustion and
--                                    increments used_count in the same txn
--   * sales_release_discount_code -> AFTER UPDATE, returns the use on void
--   * create_combo_sale RPC       -> one transaction for 1 sale + N packages +
--                                    N sale_packages join rows
--
-- sale_balances / deriveSaleBalance / caja / dashboard KPI are untouched: a
-- discount only lowers sales.total, which is already the payment cap.

-- 0. citext for case-insensitive discount codes. The design assumed it was
--    already enabled ("citext from 0001") but no prior migration created it.
create extension if not exists citext with schema extensions;

-- 1. New catalog + junction tables FIRST (sales FKs reference them).
create table promotions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('combo', 'bonus')),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table promotion_items (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references promotions (id) on delete cascade,
  tariff_id uuid not null references package_templates (id) on delete restrict,
  bonus_sessions int not null default 0 check (bonus_sessions >= 0),
  override_price numeric(12, 2) check (override_price > 0)
);
create unique index promotion_items_promotion_tariff_idx
  on promotion_items (promotion_id, tariff_id);

create table discount_codes (
  id uuid primary key default gen_random_uuid(),
  code extensions.citext not null,
  kind text not null check (kind in ('percent', 'fixed')),
  value numeric(12, 2) not null check (value > 0),
  max_uses int check (max_uses > 0),
  used_count int not null default 0 check (used_count >= 0),
  valid_from date,
  valid_to date,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint discount_codes_within_cap
    check (max_uses is null or used_count <= max_uses)
);
create unique index discount_codes_code_active_idx
  on discount_codes (lower(code)) where active;

-- 2. sales money model — add nullable, backfill, lock, constrain.
alter table sales
  add column list_total       numeric(12, 2),
  add column discount_amount  numeric(12, 2) not null default 0
        check (discount_amount >= 0),
  add column discount_reason  text,
  add column promotion_id     uuid references promotions (id)     on delete set null,
  add column discount_code_id uuid references discount_codes (id) on delete set null,
  add column discounted_by    uuid references staff (id)          on delete set null;

update sales set list_total = total where list_total is null;

-- list_total is effectively NOT NULL, enforced by a CHECK rather than a column
-- flag: the sales_set_list_total_default trigger below fills it for every sell
-- path that predates the P2 discount work, and a CHECK (unlike SET NOT NULL)
-- keeps the generated Insert type treating list_total as optional so those
-- call sites compile untouched.
alter table sales
  add constraint sales_list_total_present check (list_total is not null),
  add constraint sales_money_identity
    check (total = list_total - discount_amount);
-- existing `total > 0` CHECK stays: numeric(12,2) + `> 0` => total >= 0.01,
-- which is the spec's "no fully-comped sale" rule.

-- 2b. New sales rows that don't set list_total explicitly (every sell path
--     that predates the P2 discount work) get list_total = total, keeping the
--     money-identity + presence CHECKs satisfied without touching those sites.
create function public.sales_set_list_total_default()
returns trigger
language plpgsql
as $$
begin
  if new.list_total is null then
    new.list_total := new.total;
  end if;
  return new;
end;
$$;
create trigger sales_set_list_total_default_trg
  before insert on sales
  for each row
  execute function public.sales_set_list_total_default();

-- 3. combo junction (after sales exists).
create table sale_packages (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete cascade,
  client_package_id uuid not null unique
    references client_packages (id) on delete restrict,
  created_at timestamptz not null default now()
);
create index sale_packages_sale_id_idx on sale_packages (sale_id);

-- 4. RLS — the is_staff() policy verbatim (0002/0011 style) on every new table.
alter table promotions      enable row level security;
alter table promotion_items enable row level security;
alter table discount_codes  enable row level security;
alter table sale_packages   enable row level security;

create policy "promotions_staff_all" on promotions
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "promotion_items_staff_all" on promotion_items
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "discount_codes_staff_all" on discount_codes
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "sale_packages_staff_all" on sale_packages
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 5. Atomic code-usage guard (mirrors payments_reject_overpayment in 0006).
--    Locks the code row FOR UPDATE so two concurrent sales can't both read a
--    stale used_count and both pass the exhaustion check.
create function public.sales_apply_discount_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c discount_codes%rowtype;
  v_today date := (now() at time zone 'America/Argentina/Buenos_Aires')::date;
begin
  if new.discount_code_id is null then
    return new;
  end if;

  select * into c from discount_codes where id = new.discount_code_id for update;

  if not c.active then
    raise exception 'discount_code_inactive: %', c.code
      using errcode = 'check_violation';
  end if;

  if (c.valid_from is not null and v_today < c.valid_from)
     or (c.valid_to is not null and v_today > c.valid_to) then
    raise exception 'discount_code_out_of_window: %', c.code
      using errcode = 'check_violation';
  end if;

  if c.max_uses is not null and c.used_count >= c.max_uses then
    raise exception 'discount_code_exhausted: %', c.code
      using errcode = 'check_violation';
  end if;

  update discount_codes set used_count = used_count + 1 where id = c.id;
  return new;
end;
$$;
create trigger sales_apply_discount_code_trg
  before insert on sales
  for each row
  execute function public.sales_apply_discount_code();

-- 6. Void returns the use. Fires only on open -> void for a code-bearing sale.
create function public.sales_release_discount_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.status <> 'void'
     and new.status = 'void'
     and new.discount_code_id is not null then
    update discount_codes
      set used_count = greatest(used_count - 1, 0)
      where id = new.discount_code_id;
  end if;
  return new;
end;
$$;
create trigger sales_release_discount_code_trg
  after update on sales
  for each row
  execute function public.sales_release_discount_code();

-- 7. Combo sale RPC — one transaction for 1 sale + N packages + N join rows.
--    p_lines: [{ tariff_id, zone_id, total_sessions }]
create function public.create_combo_sale(
  p_client_id uuid,
  p_promotion_id uuid,
  p_description text,
  p_list_total numeric,
  p_discount_amount numeric,
  p_discount_reason text default null,
  p_discount_code_id uuid default null,
  p_discounted_by uuid default null,
  p_lines jsonb default '[]'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_pkg_id uuid;
  ln jsonb;
begin
  insert into sales (
    client_id, description, total, list_total, discount_amount,
    discount_reason, promotion_id, discount_code_id, discounted_by
  )
  values (
    p_client_id, p_description, p_list_total - p_discount_amount, p_list_total,
    p_discount_amount, p_discount_reason, p_promotion_id, p_discount_code_id,
    p_discounted_by
  )
  returning id into v_sale_id;

  for ln in select * from jsonb_array_elements(p_lines) loop
    insert into client_packages (client_id, template_id, zone_id, total_sessions)
    values (
      p_client_id,
      (ln ->> 'tariff_id')::uuid,
      (ln ->> 'zone_id')::uuid,
      (ln ->> 'total_sessions')::int
    )
    returning id into v_pkg_id;

    insert into sale_packages (sale_id, client_package_id)
    values (v_sale_id, v_pkg_id);
  end loop;

  return v_sale_id;
end;
$$;

revoke all on function public.create_combo_sale(
  uuid, uuid, text, numeric, numeric, text, uuid, uuid, jsonb
) from public, anon;
grant execute on function public.create_combo_sale(
  uuid, uuid, text, numeric, numeric, text, uuid, uuid, jsonb
) to authenticated;

-- 8. Extend the dev-only truncate_table allow-list (last redefined 0011).
create or replace function public.truncate_table(table_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if table_name not in (
    'staff', 'clients', 'body_zones', 'package_templates', 'client_packages',
    'appointments', 'sales', 'payments', 'expense_categories', 'expenses',
    'reminder_log', 'clinic_settings', 'cash_sessions', 'cash_movements',
    'promotions', 'promotion_items', 'discount_codes', 'sale_packages'
  ) then
    raise exception 'truncate_table: % is not an allowed table', table_name;
  end if;
  execute format('truncate table %I restart identity cascade', table_name);
end;
$$;
