-- Staff table and the is_staff() helper every other table's RLS policy uses.
create table staff (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  full_name text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- SECURITY DEFINER + a fixed search_path: this function runs with the
-- privileges of its owner, bypassing RLS on `staff` itself. That is what
-- prevents infinite recursion when `staff`'s own policy calls is_staff().
create function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from staff where user_id = auth.uid() and active
  );
$$;

alter table staff enable row level security;

-- No insert/update policy on `staff` on purpose: staff rows are created only
-- by migration or a service-role client, so an authenticated stranger can
-- never self-promote into staff.
create policy "staff_select_self_or_staff" on staff
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());
