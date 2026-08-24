import { toZonedTime, formatInTimeZone } from "date-fns-tz";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";

export type DateRange = { start: Date; end: Date };

/**
 * Bounds of "tomorrow" in the Buenos Aires calendar (00:00 to the next
 * 00:00, as UTC instants) relative to `now` — the daily reminder cron's
 * ~24h-ahead window (spec: "appointment-reminders" / 24h email reminder).
 * Mirrors `getClinicDayBounds` (dashboard) shifted one BA calendar day
 * forward.
 */
export function getReminderWindowBounds(now: Date): DateRange {
  const zoned = toZonedTime(now, CLINIC_TZ);
  const y = zoned.getFullYear();
  const m = zoned.getMonth();
  const d = zoned.getDate();
  return {
    // Buenos Aires has no DST; UTC-3 is a fixed offset year-round.
    start: new Date(Date.UTC(y, m, d + 1, 3)),
    end: new Date(Date.UTC(y, m, d + 2, 3)),
  };
}

/**
 * Tomorrow's BA calendar date as `yyyy-MM-dd` — the `reminder_log.send_date`
 * dedupe key for a cron run starting at `now`.
 */
export function getReminderSendDate(now: Date): string {
  const { start } = getReminderWindowBounds(now);
  return formatInTimeZone(start, CLINIC_TZ, "yyyy-MM-dd");
}
