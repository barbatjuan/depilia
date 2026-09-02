import { toZonedTime } from "date-fns-tz";
import { CLINIC_TZ } from "@/lib/clinic-tz";

export { CLINIC_TZ };

/**
 * Accounting period helpers. A "month key" is `"YYYY-MM"` in the clinic's
 * timezone. Generalizes `expenses/domain/month-total.ts::currentMonthRange`
 * to any month + a year-to-date range.
 *
 * `monthRange` returns BOTH shapes a query needs:
 *  - `startUtc` / `endUtc` — ISO `timestamptz` bounds at BA-midnight (UTC-3),
 *    for `.gte("sold_at" | "paid_at", startUtc).lt(..., endUtc)`.
 *  - `startDate` / `endDate` — `"YYYY-MM-DD"` (exclusive end), for the plain
 *    SQL `date` columns `spent_on` / `business_date`.
 */

const BA_UTC_OFFSET_HOURS = 3; // Buenos Aires is UTC-3, no DST

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export type MonthParts = { year: number; month: number }; // month is 1-12

export type PeriodRange = {
  startUtc: string;
  endUtc: string;
  startDate: string;
  endDate: string;
};

/** `"YYYY-MM"` of the clinic-local calendar month an instant falls in. */
export function monthKey(instant: Date): string {
  const zoned = toZonedTime(instant, CLINIC_TZ);
  return `${zoned.getFullYear()}-${pad(zoned.getMonth() + 1)}`;
}

function parseKey(key: string): MonthParts | null {
  const match = /^(\d{4})-(\d{2})$/.exec(key);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function parseMonthKey(key: string): MonthParts {
  const parts = parseKey(key);
  if (!parts) throw new Error(`Mes inválido: ${key}`);
  return parts;
}

/** A `?mes=` search param → a valid month key, falling back to the current month. */
export function parseMonthParam(
  param: string | undefined | null,
  now: Date,
): string {
  if (param && parseKey(param)) return param;
  return monthKey(now);
}

function rangeFromParts(
  from: MonthParts,
  toExclusive: MonthParts,
): PeriodRange {
  const start = new Date(
    Date.UTC(from.year, from.month - 1, 1, BA_UTC_OFFSET_HOURS),
  );
  const end = new Date(
    Date.UTC(toExclusive.year, toExclusive.month - 1, 1, BA_UTC_OFFSET_HOURS),
  );
  return {
    startUtc: start.toISOString(),
    endUtc: end.toISOString(),
    startDate: `${from.year}-${pad(from.month)}-01`,
    endDate: `${toExclusive.year}-${pad(toExclusive.month)}-01`,
  };
}

function addMonth({ year, month }: MonthParts, delta: number): MonthParts {
  const zeroBased = month - 1 + delta;
  return {
    year: year + Math.floor(zeroBased / 12),
    month: ((zeroBased % 12) + 12) % 12 + 1,
  };
}

/** Bounds of a single month. */
export function monthRange(key: string): PeriodRange {
  const parts = parseMonthKey(key);
  return rangeFromParts(parts, addMonth(parts, 1));
}

export function prevMonthKey(key: string): string {
  const p = addMonth(parseMonthKey(key), -1);
  return `${p.year}-${pad(p.month)}`;
}

export function nextMonthKey(key: string): string {
  const p = addMonth(parseMonthKey(key), 1);
  return `${p.year}-${pad(p.month)}`;
}

export function yearStartKey(key: string): string {
  return `${parseMonthKey(key).year}-01`;
}

/** January 1 of `key`'s year through the end of `key`'s month. */
export function ytdRange(key: string): PeriodRange {
  const parts = parseMonthKey(key);
  return rangeFromParts({ year: parts.year, month: 1 }, addMonth(parts, 1));
}

/** The last `n` month keys, newest first, ending at the current month. */
export function recentMonthKeys(now: Date, n: number): string[] {
  const current = parseMonthKey(monthKey(now));
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const p = addMonth(current, -i);
    out.push(`${p.year}-${pad(p.month)}`);
  }
  return out;
}

export function formatMonthLabel(key: string, locale: string): string {
  const { year, month } = parseMonthKey(key);
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: CLINIC_TZ,
  }).format(new Date(Date.UTC(year, month - 1, 15, 12)));
}
