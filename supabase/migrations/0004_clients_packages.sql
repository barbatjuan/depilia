-- Clients and their purchased packages (session ledger balances live here).
create table clients (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  phone text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table client_packages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  -- template_id is set null on template edits/removal: package sale history
  -- must survive catalog changes.
  template_id uuid references package_templates (id) on delete set null,
  -- zone_id is a snapshot at sale time, not a live lookup through the
  -- template, so relabeling a template's zone never rewrites history.
  zone_id uuid not null references body_zones (id) on delete restrict,
  total_sessions int not null check (total_sessions > 0),
  sessions_used int not null default 0 check (sessions_used >= 0),
  created_at timestamptz not null default now(),
  constraint sessions_used_within_total check (sessions_used <= total_sessions)
  -- No expiry column by design: packages in this clinic never expire.
);

alter table clients enable row level security;
alter table client_packages enable row level security;

create policy "clients_staff_all" on clients
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "client_packages_staff_all" on client_packages
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
