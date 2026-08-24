-- Sales and payments. Balance owed is NEVER a stored column — it is always
-- derived (see the sale_balances view in 0009_views.sql) so no code path can
-- let it drift from total - sum(payments).
create table sales (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  client_package_id uuid unique references client_packages (id) on delete restrict,
  appointment_id uuid references appointments (id) on delete set null,
  description text not null,
  total numeric(12, 2) not null check (total > 0),
  sold_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open', 'void')),
  constraint package_xor_appointment
    check (client_package_id is null or appointment_id is null)
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  paid_at timestamptz not null default now(),
  method text not null check (method in ('cash', 'card', 'transfer', 'other')),
  note text
);

create index payments_sale_id_idx on payments (sale_id);

alter table sales enable row level security;
alter table payments enable row level security;

create policy "sales_staff_all" on sales
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "payments_staff_all" on payments
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- Overpayment guard: locks the sale row (FOR UPDATE) before checking, so two
-- concurrent inserts against the same sale serialize instead of both reading
-- a stale "paid so far" total and both passing the check.
create function public.payments_reject_overpayment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total numeric(12, 2);
  v_paid numeric(12, 2);
begin
  select total into v_total from sales where id = new.sale_id for update;

  select coalesce(sum(amount), 0) into v_paid
    from payments where sale_id = new.sale_id;

  if v_paid + new.amount > v_total then
    raise exception 'payment_exceeds_balance: payment % would exceed remaining balance on sale %',
      new.amount, new.sale_id
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

create trigger payments_reject_overpayment_trg
  before insert on payments
  for each row
  execute function public.payments_reject_overpayment();
