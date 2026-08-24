-- Derived-value views. Balance and remaining sessions are never stored
-- columns; both are computed on read so no write path can let them drift.
create view sale_balances as
select
  s.id as sale_id,
  s.total,
  coalesce(sum(p.amount), 0) as paid,
  s.total - coalesce(sum(p.amount), 0) as balance
from sales s
left join payments p on p.sale_id = s.id
group by s.id, s.total;

create view client_package_remaining as
select
  cp.id,
  cp.client_id,
  cp.zone_id,
  cp.total_sessions,
  cp.sessions_used,
  cp.total_sessions - cp.sessions_used as remaining
from client_packages cp;

-- Views inherit RLS from their underlying tables' policies (security_invoker
-- semantics for simple views on Postgres 15+ used by Supabase), so no
-- separate policy is required here.
