-- IVA per tariff/sale. Prices are VAT-inclusive; `vat_rate` is the fraction
-- (0.210 = 21%) split out at report/detail time via splitVat(). Snapshotted
-- onto `sales.vat_rate` at sell time so a later tariff-rate change never
-- reopens the tax math on a past sale — same pattern as `sales.list_total`
-- (0015) and `sale_packages` freezing the combo lines.
alter table package_templates
  add column vat_rate numeric(4, 3) not null default 0.210
    check (vat_rate >= 0 and vat_rate < 1);

alter table clinic_settings
  add column default_vat_rate numeric(4, 3) not null default 0.210
    check (default_vat_rate >= 0 and default_vat_rate < 1);

alter table sales
  add column vat_rate numeric(4, 3) not null default 0.210
    check (vat_rate >= 0 and vat_rate < 1);

-- Backfill: bono/loose-session sales inherit their tariff's rate via the
-- client_package they're linked to. Combo/custom sales (no client_package_id,
-- or a promotion combo) keep the column default (0.210) — no tariff row to
-- backfill from, and combo isn't sellable from the app yet (RPC + test only).
update sales s
set vat_rate = pt.vat_rate
from client_packages cp
join package_templates pt on pt.id = cp.template_id
where s.client_package_id = cp.id;

-- create_combo_sale gains p_vat_rate (optional): the caller can pass an
-- explicit rate, or omit it and let the function derive one from the lines'
-- tariffs — shared rate if every line agrees, `clinic_settings.default_vat_rate`
-- otherwise (the app-side combo sell path isn't built yet; only this RPC +
-- its integration test exercise the column today).
drop function public.create_combo_sale(
  uuid, uuid, text, numeric, numeric, text, uuid, uuid, jsonb
);

create function public.create_combo_sale(
  p_client_id uuid,
  p_promotion_id uuid,
  p_description text,
  p_list_total numeric,
  p_discount_amount numeric,
  p_discount_reason text default null,
  p_discount_code_id uuid default null,
  p_discounted_by uuid default null,
  p_lines jsonb default '[]'::jsonb,
  p_vat_rate numeric default null
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale_id uuid;
  v_pkg_id uuid;
  v_vat_rate numeric(4, 3);
  v_rate_count int;
  ln jsonb;
begin
  if p_vat_rate is not null then
    v_vat_rate := p_vat_rate;
  else
    select count(distinct pt.vat_rate), min(pt.vat_rate)
      into v_rate_count, v_vat_rate
      from jsonb_array_elements(p_lines) l
      join package_templates pt on pt.id = (l ->> 'tariff_id')::uuid;

    if v_rate_count is null or v_rate_count <> 1 then
      select default_vat_rate into v_vat_rate from clinic_settings limit 1;
      v_vat_rate := coalesce(v_vat_rate, 0.210);
    end if;
  end if;

  insert into sales (
    client_id, description, total, list_total, discount_amount,
    discount_reason, promotion_id, discount_code_id, discounted_by, vat_rate
  )
  values (
    p_client_id, p_description, p_list_total - p_discount_amount, p_list_total,
    p_discount_amount, p_discount_reason, p_promotion_id, p_discount_code_id,
    p_discounted_by, v_vat_rate
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
  uuid, uuid, text, numeric, numeric, text, uuid, uuid, jsonb, numeric
) from public, anon;
grant execute on function public.create_combo_sale(
  uuid, uuid, text, numeric, numeric, text, uuid, uuid, jsonb, numeric
) to authenticated;
