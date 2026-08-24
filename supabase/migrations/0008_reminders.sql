-- Reminder send log: dedupe key is (appointment_id, channel, send_date), so
-- a rerun of the daily cron job that already claimed a date is a no-op.
create table reminder_log (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references appointments (id) on delete cascade,
  channel text not null default 'email',
  send_date date not null,
  status text not null check (status in ('pending', 'sent', 'failed')),
  provider_message_id text,
  unique (appointment_id, channel, send_date)
);

alter table reminder_log enable row level security;

create policy "reminder_log_staff_all" on reminder_log
  for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
