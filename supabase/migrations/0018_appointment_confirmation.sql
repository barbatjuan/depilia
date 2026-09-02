-- Appointment confirmation. `confirmed_at` is orthogonal to `status`
-- (scheduled / completed / cancelled / no_show): a scheduled turno is
-- "sin confirmar" until the client confirms (front desk toggle now, a
-- WhatsApp "Confirmar" button later). Completing / cancelling / no-showing
-- leaves the flag as-is for the record.
alter table appointments
  add column confirmed_at timestamptz;
