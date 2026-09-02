import { formatInTimeZone } from "date-fns-tz";

export const CLINIC_TZ = "America/Argentina/Buenos_Aires";

const DAY_MS = 24 * 60 * 60 * 1000;

/** The clinic-local calendar date (`yyyy-MM-dd`) an instant falls on. */
export function dayKey(instant: Date): string {
  return formatInTimeZone(instant, CLINIC_TZ, "yyyy-MM-dd");
}

/**
 * The last `days` clinic-local dates, oldest first, ending on the date that
 * `now` falls on. Anchored at noon UTC so the ±3h offset never crosses a day.
 */
export function windowDates(days: number, now: Date): string[] {
  const anchor = new Date(`${dayKey(now)}T12:00:00Z`);
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    out.push(dayKey(new Date(anchor.getTime() - i * DAY_MS)));
  }
  return out;
}
