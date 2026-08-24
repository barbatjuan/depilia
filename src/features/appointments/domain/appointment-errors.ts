export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo guardar el turno. Intentá de nuevo.";

/**
 * Maps a raw Postgres/PostgREST error into a friendly Spanish message —
 * never lets a raw exclusion-constraint or trigger stack trace reach the UI
 * (design decision 2, "the trigger is unbypassable"; the errors it and the
 * overlap `EXCLUDE` constraint raise are expected, recoverable user
 * mistakes, not bugs).
 *
 * - `23P01` is the Postgres SQLSTATE for an exclusion-constraint violation —
 *   here, always the single-chair overlap constraint on `appointments`.
 * - `package_exhausted` / `appointment_not_found` are the two custom
 *   exception messages the session-ledger trigger and `set_appointment_status`
 *   RPC raise (migration `0005_appointments_ledger.sql`).
 */
export function mapAppointmentError(error: PostgresLikeError): string {
  if (error.code === "23P01") {
    return "Ese horario se superpone con otro turno ya agendado. Elegí otro horario.";
  }
  if (error.message?.includes("package_exhausted")) {
    return "Este paquete no tiene sesiones disponibles.";
  }
  if (error.message?.includes("appointment_not_found")) {
    return "El turno no existe o fue eliminado.";
  }
  return GENERIC_MESSAGE;
}
