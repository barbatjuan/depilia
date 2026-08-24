import { startOfWeek } from "date-fns";
import { toZonedTime } from "date-fns-tz";

export const CLINIC_TZ = "America/Argentina/Buenos_Aires";

export type DateRange = { start: Date; end: Date };

/**
 * The Buenos Aires calendar day (00:00 to next 00:00, in UTC instants) that
 * `now` falls in. Naive UTC-date arithmetic would misclassify appointments
 * near UTC midnight — BA is UTC-3, so e.g. `02:00Z` is still "yesterday"
 * locally (spec: "clinic-dashboard" / today's schedule widget).
 */
export function getClinicDayBounds(now: Date): DateRange {
  const zoned = toZonedTime(now, CLINIC_TZ);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const d = zoned.getDate();
  return {
    // Buenos Aires has no DST; UTC-3 is a fixed offset year-round.
    start: new Date(Date.UTC(y, m, d, 3)),
    end: new Date(Date.UTC(y, m, d + 1, 3)),
  };
}

/**
 * The Buenos Aires calendar week (Monday 00:00 to the following Monday
 * 00:00) that `now` falls in — used by the "Esta semana" widget.
 */
export function getClinicWeekBounds(now: Date): DateRange {
  const zoned = toZonedTime(now, CLINIC_TZ);
  const weekStartZoned = startOfWeek(zoned, { weekStartsOn: 1 });
  const y = weekStartZoned.getFullYear();
  const m = weekStartZoned.getMonth();
  const d = weekStartZoned.getDate();
  const start = new Date(Date.UTC(y, m, d, 3));
  const end = new Date(Date.UTC(y, m, d + 7, 3));
  return { start, end };
}

/**
 * Buckets appointments into 7 BA-weekday slots (index 0 = Monday … 6 =
 * Sunday) relative to `weekStart` (as returned by `getClinicWeekBounds`).
 */
export function bucketAppointmentsByWeekday(
  appointments: { scheduledAt: string }[],
  weekStart: Date,
): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const appt of appointments) {
    const diffMs = new Date(appt.scheduledAt).getTime() - weekStart.getTime();
    const dayIndex = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < 7) {
      counts[dayIndex] = (counts[dayIndex] ?? 0) + 1;
    }
  }
  return counts;
}
