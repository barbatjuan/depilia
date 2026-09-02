-- Per-zone recommended weeks between laser sessions. Powers "Recontacto por
-- zona" (Fase 1): a client with an active bono whose last session in a zone
-- is past that zone's cadence is a warm re-contact lead. Default 6 (a common
-- mid-body interval); staff tune it per zone. No standalone zonas screen
-- exists yet -- zones are only created through the tariff form -- so this is
-- adjusted via Studio until one does.
alter table body_zones
  add column recommended_weeks int not null default 6
    check (recommended_weeks between 1 and 52);
