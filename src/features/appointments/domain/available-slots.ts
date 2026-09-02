export type ExistingAppointmentForSlots = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
};

function slotToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":");
  return Number(hours) * 60 + Number(minutes);
}

/** BA-local minutes-of-day for a UTC instant (BA is fixed UTC-3, no DST). */
function localMinutesOfDay(iso: string): number {
  const shifted = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000);
  return shifted.getUTCHours() * 60 + shifted.getUTCMinutes();
}

/**
 * Filters a grid of `"HH:mm"` slots down to the ones that would NOT overlap
 * an existing `scheduled` turno of that same day, given the duration the
 * caller is trying to book. Mirrors the single-chair overlap `EXCLUDE`
 * constraint (`supabase/migrations/0005_appointments_ledger.sql`) — global
 * across zones, only `scheduled` rows count. Pure: callers must already have
 * scoped `existingAppointments` to the one calendar day being checked.
 */
export function availableSlots(
  allSlots: string[],
  existingAppointments: ExistingAppointmentForSlots[],
  opts: { durationMinutes: number; excludeAppointmentId?: string },
): string[] {
  const busyRanges = existingAppointments
    .filter(
      (a) =>
        a.status === "scheduled" && a.id !== opts.excludeAppointmentId,
    )
    .map((a) => {
      const start = localMinutesOfDay(a.scheduledAt);
      return { start, end: start + a.durationMinutes };
    });

  if (busyRanges.length === 0) return [...allSlots];

  return allSlots.filter((slot) => {
    const start = slotToMinutes(slot);
    const end = start + opts.durationMinutes;
    return !busyRanges.some((b) => start < b.end && end > b.start);
  });
}
