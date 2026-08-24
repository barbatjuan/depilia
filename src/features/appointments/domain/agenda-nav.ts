import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";

export type AgendaView = "day" | "week";

/**
 * Parses the agenda's `?date=yyyy-MM-dd` search param into a `Date`
 * instance anchored at BA midday of that calendar date (midday, not
 * midnight, so it is never accidentally pushed into the neighboring day by
 * downstream BA-bounds math). Falls back to `now` when the param is missing
 * or malformed — the agenda must never crash on a bad/stale URL.
 */
export function parseAgendaDate(
  dateParam: string | undefined,
  now = new Date(),
): Date {
  if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    const candidate = new Date(`${dateParam}T12:00:00-03:00`);
    if (!Number.isNaN(candidate.getTime())) return candidate;
  }
  return now;
}

/**
 * Shifts the agenda's reference date by one day (day view) or one week
 * (week view) navigation step. Buenos Aires has a fixed UTC-3 offset
 * year-round (no DST), so adding real calendar days on the underlying UTC
 * instant is always equivalent to adding BA calendar days.
 */
export function shiftAgendaDate(
  current: Date,
  view: AgendaView,
  direction: 1 | -1,
): Date {
  const days = view === "day" ? 1 : 7;
  return addDays(current, days * direction);
}

/** Formats a date as the agenda's `yyyy-MM-dd` URL param, in BA local time. */
export function formatAgendaDateParam(date: Date): string {
  return formatInTimeZone(date, CLINIC_TZ, "yyyy-MM-dd");
}
