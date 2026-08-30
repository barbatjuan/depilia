-- Daily cash register (caja diaria). Additive: one apertura/cierre per BA
-- calendar day, manual cash movements, and an end-of-day arqueo that snapshots
-- a theoretical balance derived from cash payments, cash expenses and signed
-- movements. Money invariants live in Postgres (CHECK + BEFORE triggers with
-- FOR UPDATE locks), mirroring payments_reject_overpayment in 0006. The live
-- theoretical balance is a view; the closed arqueo is the one deliberate
-- snapshot, because a view over mutable payments/expenses would rewrite
-- history retroactively.

-- 1. expenses.method FIRST — the view in step 6 references it. Mirrors
--    payments.method ('cash','card','transfer','other'); existing rows adopt
--    the default.
alter table expenses
  add column method text not null default 'cash'
  check (method in ('cash', 'card', 'transfer', 'other'));

create index expenses_cash_spent_on_idx on expenses (spent_on) where method = 'cash';
create index payments_cash_paid_at_idx on payments (paid_at) where method = 'cash';

-- 2. Actor helper: resolve staff.id from the current JWT. SECURITY DEFINER +
--    fixed search_path so it can read `staff` past its own RLS, exactly like
--    public.is_staff() in 0002.
create function public.current_staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from staff where user_id = auth.uid() and active limit 1;
$$;

-- 3. Sessions: at most one per BA calendar day (UNIQUE(business_date)).
--    opening_amount is exactly operator-entered — no DB carry-forward.
create table cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_date date not null unique,
  status text not null default 'open' check (status in ('open', 'closed')),
  opening_amount numeric(12, 2) not null check (opening_amount >= 0),
  opened_at timestamptz not null default now(),
  opened_by uuid not null default public.current_staff_id() references staff (id),
  counted_amount numeric(12, 2) check (counted_amount >= 0),
  theoretical_amount numeric(12, 2),
  difference numeric(12, 2),
  closing_note text,
  closed_at timestamptz,
  closed_by uuid references staff (id),
  constraint closed_session_is_complete check (
    status = 'open'
    or (counted_amount is not null
        and theoretical_amount is not null
        and difference is not null
        and closed_at is not null))
);

-- 4. Movements: linked to a session, amount > 0 for every kind, sign carried
--    by `direction`. CHECK pins ingreso->in / retiro->out and leaves `ajuste`
--    free because it is inherently bidirectional.
create table cash_movements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references cash_sessions (id) on delete restrict,
  kind text not null check (kind in ('retiro', 'ingreso', 'ajuste')),
  direction text not null check (direction in ('in', 'out')),
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  created_at timestamptz not null default now(),
  created_by uuid not null default public.current_staff_id() references staff (id),
  constraint kind_matches_direction check (
    (kind = 'ingreso' and direction = 'in')
    or (kind = 'retiro' and direction = 'out')
    or kind = 'ajuste')
);

create index cash_movements_session_id_idx on cash_movements (session_id);

-- 5. RLS — the is_staff() policy verbatim on both new tables.
alter table cash_sessions enable row level security;
alter table cash_movements enable row level security;

create policy "cash_sessions_staff_all" on cash_sessions
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "cash_movements_staff_all" on cash_movements
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- 6. Live theoretical balance — OPEN sessions only. A closed row already
--    carries its snapshot, so excluding it makes "the view is only ever the
--    live number" a structural fact.
create view cash_session_theoretical as
select
  s.id as session_id,
  s.business_date,
  s.opening_amount,
  coalesce(p.cash_in, 0) as cash_payments,
  coalesce(m.net, 0) as movements_net,
  coalesce(e.cash_out, 0) as cash_expenses,
  s.opening_amount
    + coalesce(p.cash_in, 0)
    + coalesce(m.net, 0)
    - coalesce(e.cash_out, 0) as theoretical_amount
from cash_sessions s
left join lateral (
  select sum(amount) as cash_in
  from payments
  where method = 'cash'
    and paid_at >= (s.business_date::timestamp at time zone 'America/Argentina/Buenos_Aires')
    and paid_at < ((s.business_date + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
) p on true
left join lateral (
  select sum(case when direction = 'in' then amount else -amount end) as net
  from cash_movements
  where session_id = s.id
) m on true
left join lateral (
  select sum(amount) as cash_out
  from expenses
  where method = 'cash' and spent_on = s.business_date
) e on true
where s.status = 'open';

-- 7. Movements only on an OPEN session. Locks the parent FOR UPDATE so a
--    movement insert racing a close waits for that close to commit and then
--    fails on status='closed'.
create function public.cash_movements_require_open_session()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select status into v_status from cash_sessions where id = new.session_id for update;
  if v_status is distinct from 'open' then
    raise exception 'cash_session_not_open: session % is not open', new.session_id
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger cash_movements_require_open_session_trg
  before insert on cash_movements
  for each row
  execute function public.cash_movements_require_open_session();

-- 8. Close snapshot. Fires on open -> closed only; close is terminal. Computes
--    theoretical once (same expression as the view) and writes the immutable
--    theoretical_amount / difference onto the row.
create function public.cash_sessions_close_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_theoretical numeric(12, 2);
begin
  if old.status = 'closed' then
    raise exception 'cash_session_already_closed: session % is closed', old.id
      using errcode = 'check_violation';
  end if;

  if new.status <> 'closed' then
    return new;
  end if;

  if new.counted_amount is null then
    raise exception 'cash_session_count_required: counted_amount is required to close'
      using errcode = 'check_violation';
  end if;

  select new.opening_amount
    + coalesce((
        select sum(amount) from payments
        where method = 'cash'
          and paid_at >= (new.business_date::timestamp at time zone 'America/Argentina/Buenos_Aires')
          and paid_at < ((new.business_date + 1)::timestamp at time zone 'America/Argentina/Buenos_Aires')
      ), 0)
    + coalesce((
        select sum(case when direction = 'in' then amount else -amount end)
        from cash_movements where session_id = new.id
      ), 0)
    - coalesce((
        select sum(amount) from expenses
        where method = 'cash' and spent_on = new.business_date
      ), 0)
  into v_theoretical;

  new.theoretical_amount := v_theoretical;
  new.difference := new.counted_amount - v_theoretical;
  new.closed_at := coalesce(new.closed_at, now());
  new.closed_by := coalesce(new.closed_by, public.current_staff_id());
  return new;
end;
$$;

create trigger cash_sessions_close_snapshot_trg
  before update on cash_sessions
  for each row
  execute function public.cash_sessions_close_snapshot();

-- 9. Extend the dev-only truncate_table allow-list (0010) so integration
--    fixtures can reset the new tables. FK-restrict order is handled by the
--    caller; `truncate ... cascade` covers the rest.
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
    'reminder_log', 'clinic_settings', 'cash_sessions', 'cash_movements'
  ) then
    raise exception 'truncate_table: % is not an allowed table', table_name;
  end if;
  execute format('truncate table %I restart identity cascade', table_name);
end;
$$;
