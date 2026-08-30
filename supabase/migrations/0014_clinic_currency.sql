-- Clinic currency + formatting locale (spec: clinic-currency R1).
-- One configured (currency, locale) pair governs every money value shown in
-- the app. Stored amounts are never converted — this only drives formatting.
-- `clinic_settings` is the existing singleton (id boolean primary key); the
-- 0010 seed inserts its row, but integration suites truncate the table, so
-- the app tolerates a missing row and falls back to these same defaults.

alter table clinic_settings
  add column currency text not null default 'EUR'
    check (currency ~ '^[A-Z]{3}$'),
  add column locale text not null default 'es-ES';
