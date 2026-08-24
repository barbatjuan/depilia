import { toZonedTime } from "date-fns-tz";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";

type AppointmentLike = { scheduledAt: string };

/**
 * Buckets appointments into their Buenos Aires local hour (24h, e.g. `9` for
 * 09:xx) for the agenda's day-view hour grid. Appointments whose BA-local
 * hour falls outside `[startHour, endHour)` are dropped — the grid only
 * renders clinic operating hours. Appointments in the same hour are ordered
 * by time.
 */
export function groupAppointmentsByHour<T extends AppointmentLike>(
  appointments: T[],
  _dayStart: Date,
  startHour: number,
  endHour: number,
): Map<number, T[]> {
  const grouped = new Map<number, T[]>();
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  for (const appt of sorted) {
    const zoned = toZonedTime(new Date(appt.scheduledAt), CLINIC_TZ);
    const hour = zoned.getHours();
    if (hour < startHour || hour >= endHour) continue;
    const bucket = grouped.get(hour) ?? [];
    bucket.push(appt);
    grouped.set(hour, bucket);
  }

  return grouped;
}

/**
 * Groups appointments into 7 BA-weekday columns (index 0 = Monday … 6 =
 * Sunday) relative to `weekStart` (as returned by
 * `getClinicWeekBounds`) — backs the agenda's week view.
 */
export function groupAppointmentsByWeekday<T extends AppointmentLike>(
  appointments: T[],
  weekStart: Date,
): T[][] {
  const columns: T[][] = [[], [], [], [], [], [], []];
  const sorted = [...appointments].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
  );

  for (const appt of sorted) {
    const diffMs = new Date(appt.scheduledAt).getTime() - weekStart.getTime();
    const dayIndex = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    if (dayIndex >= 0 && dayIndex < 7) {
      columns[dayIndex]?.push(appt);
    }
  }

  return columns;
}
