import { getReminderWindowBounds } from "@/features/reminders/domain/reminder-window";

export type ReminderCandidateAppointment = {
  id: string;
  scheduledAt: string;
  status: string;
};

/**
 * Pure selection of which appointments need a reminder sent on this cron
 * run: `status = 'scheduled'`, `scheduled_at` inside tomorrow's BA
 * calendar-day window, and not already present in `alreadyRemindedIds`
 * (the `reminder_log` dedupe set for this run's `send_date`).
 *
 * Kept as a pure function over already-fetched data — the DB query narrows
 * by the same window/status for efficiency, but this is the single source
 * of truth for eligibility and is what the unit tests exercise directly.
 */
export function selectAppointmentsNeedingReminder<
  T extends ReminderCandidateAppointment,
>(params: {
  appointments: T[];
  now: Date;
  alreadyRemindedIds: ReadonlySet<string>;
}): T[] {
  const { appointments, now, alreadyRemindedIds } = params;
  const { start, end } = getReminderWindowBounds(now);
  const startMs = start.getTime();
  const endMs = end.getTime();

  return appointments.filter((appt) => {
    if (appt.status !== "scheduled") return false;
    if (alreadyRemindedIds.has(appt.id)) return false;
    const scheduledAtMs = new Date(appt.scheduledAt).getTime();
    return scheduledAtMs >= startMs && scheduledAtMs < endMs;
  });
}
