-- Let staff re-open the day's caja after it was closed. Before this, close
-- was terminal: `cash_sessions_close_snapshot` rejected ANY update to a
-- closed row, and `UNIQUE(business_date)` blocks a second caja for the day —
-- so an operator who closed early (and then took more cash) was stuck with a
-- dead `/caja` screen until the next calendar day.
--
-- A `closed -> open` transition now clears the arqueo snapshot; a later close
-- recomputes it from scratch. Every other write to a closed caja is still
-- rejected, and the live theoretical view (open sessions only) picks the
-- re-opened caja back up automatically.
create or replace function public.cash_sessions_close_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_theoretical numeric(12, 2);
begin
  -- Re-open: wipe the snapshot so the caja is live again.
  if old.status = 'closed' and new.status = 'open' then
    new.counted_amount := null;
    new.theoretical_amount := null;
    new.difference := null;
    new.closed_at := null;
    new.closed_by := null;
    return new;
  end if;

  -- Any other modification of a closed caja stays forbidden.
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
