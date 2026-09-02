import { dayKey, windowDates } from "@/features/dashboard/domain/day-window";

export type AppointmentsPoint = { date: string; count: number };

type AppointmentInput = { scheduledAt: string };

/**
 * Daily appointment counts over the last `days` clinic-local days, zero-filled
 * and oldest-first. Pure — `get-appointments-series` fetches the rows.
 */
export function buildAppointmentsSeries({
  appointments,
  days,
  now,
}: {
  appointments: AppointmentInput[];
  days: number;
  now: Date;
}): AppointmentsPoint[] {
  const dates = windowDates(days, now);
  const counts = new Map(dates.map((date) => [date, 0]));

  for (const appointment of appointments) {
    const key = dayKey(new Date(appointment.scheduledAt));
    const current = counts.get(key);
    if (current !== undefined) {
      counts.set(key, current + 1);
    }
  }

  return dates.map((date) => ({ date, count: counts.get(date) ?? 0 }));
}
