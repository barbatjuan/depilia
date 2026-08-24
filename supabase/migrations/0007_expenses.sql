-- Expenses. `on delete restrict` on category_id is the DB-level guarantee
-- that a category referenced by existing expenses can never be destroyed;
-- the app-level "archive instead of delete" flow is UX on top of this.
create table expenses (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references expense_categories (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  spent_on date not null,
  description text
);

create index expenses_category_id_idx on expenses (category_id);
create index expenses_spent_on_idx on expenses (spent_on);

alter table expenses enable row level security;

create policy "expenses_staff_all" on expenses
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
