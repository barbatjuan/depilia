-- Client sex, so the agenda booking form can pre-fill the (zone × gender)
-- tariff filter from the client's own record instead of asking every time a
-- turn is booked. Nullable: pre-existing clients have no sex on file, and the
-- booking form falls back to asking when it is null. New clients are required
-- to set it by `clientSchema` (the app-side validation boundary).
alter table clients
  add column gender text
    check (gender is null or gender in ('mujer', 'hombre'));
