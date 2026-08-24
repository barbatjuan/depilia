export type AppointmentStatus =
  | "scheduled"
  | "completed"
  | "cancelled"
  | "no_show";

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "Ausente",
};

/**
 * UI-facing status transition decision table (spec: "appointment-scheduling
 * / Appointment lifecycle"). The database only enforces that `status` is one
 * of the four valid values — it does not restrict which status can follow
 * which. This table is the actual business rule: a scheduled appointment can
 * become completed, cancelled, or no_show; a completed appointment can only
 * be cancelled (which the ledger trigger interprets as "restore the
 * session"); cancelled and no_show are terminal. Rebooking after a no_show
 * happens by creating a fresh appointment (or rescheduling the time on the
 * still-`scheduled` row before it's marked no_show), never by transitioning
 * a no_show row back to scheduled.
 */
const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["completed", "cancelled", "no_show"],
  completed: ["cancelled"],
  cancelled: [],
  no_show: [],
};

export function canTransitionAppointmentStatus(
  current: AppointmentStatus,
  next: AppointmentStatus,
): boolean {
  return ALLOWED_TRANSITIONS[current].includes(next);
}

/**
 * Returns a friendly Spanish message when a transition is not allowed, or
 * `null` when it is — lets callers surface a clear error before ever
 * calling the `set_appointment_status` RPC.
 */
export function describeStatusTransitionError(
  current: AppointmentStatus,
  next: AppointmentStatus,
): string | null {
  if (canTransitionAppointmentStatus(current, next)) return null;
  return `No se puede pasar de ${STATUS_LABEL[current].toLowerCase()} a ${STATUS_LABEL[next].toLowerCase()}.`;
}
