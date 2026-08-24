-- Appointments, the single-chair overlap constraint, and the session ledger
-- trigger that is the core invariant-enforcement mechanism of the app.

-- Postgres marks the timestamptz + interval operator STABLE, not IMMUTABLE,
-- because interval arithmetic is timezone/DST-sensitive in general -- so it
-- cannot be used directly inside a GiST index expression. Appointment
-- durations here are always a small fixed number of minutes, for which that
-- sensitivity does not apply in practice, so this wrapper is deliberately
-- declared IMMUTABLE to make the overlap EXCLUDE constraint below possible.
create function public.appointment_end_at(p_scheduled_at timestamptz, p_duration_minutes int)
returns timestamptz
language sql
immutable
as $$
  select p_scheduled_at + (p_duration_minutes * interval '1 minute');
$$;

create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete restrict,
  -- NULL client_package_id means a loose (unpackaged) session.
  client_package_id uuid references client_packages (id) on delete restrict,
  zone_id uuid not null references body_zones (id) on delete restrict,
  scheduled_at timestamptz not null,
  duration_minutes int not null default 30 check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled', 'no_show')),
  -- consumed_at is the idempotency token: it records the FACT that this
  -- appointment has decremented a session, independent of what status
  -- transitions happened before or after. See the trigger below.
  consumed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumed_requires_package
    check (consumed_at is null or client_package_id is not null),
  -- Single chair: no two SCHEDULED appointments may overlap in time.
  -- Cancelled/completed/no_show rows are excluded from the range check via
  -- the WHERE clause, so freeing a slot (by cancelling) immediately allows
  -- a new booking in that same window.
  exclude using gist (
    tstzrange(scheduled_at, public.appointment_end_at(scheduled_at, duration_minutes)) with &&
  ) where (status = 'scheduled')
);

create index appointments_scheduled_at_idx on appointments (scheduled_at);
create index appointments_client_id_idx on appointments (client_id);
create index appointments_client_package_id_idx on appointments (client_package_id)
  where client_package_id is not null;

alter table appointments enable row level security;

create policy "appointments_staff_all" on appointments
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------
-- Session ledger trigger
-- ---------------------------------------------------------------------
-- BEFORE UPDATE so the row-level lock taken by this UPDATE statement itself
-- serializes concurrent transitions on the SAME appointment row; the
-- FOR UPDATE lock on the linked client_packages row serializes concurrent
-- transitions across DIFFERENT appointments sharing the same package.
create function public.appointments_session_ledger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total int;
  v_used int;
begin
  if new.status = 'completed'
     and old.consumed_at is null
     and new.client_package_id is not null then
    select total_sessions, sessions_used into v_total, v_used
      from client_packages where id = new.client_package_id for update;

    if v_used >= v_total then
      raise exception 'package_exhausted: no remaining sessions on package %', new.client_package_id
        using errcode = 'check_violation';
    end if;

    update client_packages
      set sessions_used = sessions_used + 1
      where id = new.client_package_id;
    new.consumed_at := now();

  elsif new.status <> 'completed' and old.consumed_at is not null then
    update client_packages
      set sessions_used = sessions_used - 1
      where id = old.client_package_id;
    new.consumed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger appointments_session_ledger_trg
  before update on appointments
  for each row
  execute function public.appointments_session_ledger();

-- Single mutation entry point for status transitions. Server actions call
-- this RPC instead of issuing a raw UPDATE so the trigger's contract is the
-- only way sessions_used ever changes for a package-linked appointment.
create function public.set_appointment_status(p_appointment_id uuid, p_status text)
returns appointments
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_row appointments;
begin
  update appointments
    set status = p_status
    where id = p_appointment_id
    returning * into v_row;

  if v_row.id is null then
    raise exception 'appointment_not_found: %', p_appointment_id;
  end if;

  return v_row;
end;
$$;
