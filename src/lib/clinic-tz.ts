/**
 * The one clinic timezone. Buenos Aires has no DST, so every date-bucketing
 * helper in the app pins to this — `dashboard/domain/schedule.ts`,
 * `dashboard/domain/day-window.ts`, `expenses/domain/month-total.ts`,
 * `dashboard/data/get-kpis.ts`, `accounting/domain/period.ts`.
 *
 * `clinic_settings.timezone` exists as a column but is not read anywhere yet;
 * making the app honor it is a separate change.
 */
export const CLINIC_TZ = "America/Argentina/Buenos_Aires";
