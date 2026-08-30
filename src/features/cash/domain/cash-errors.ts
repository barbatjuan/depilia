/**
 * Maps a raw Postgres/PostgREST error from the cash-register tables into a
 * friendly Spanish message (template: `features/sales/domain/payment-errors`).
 * The invariants themselves live in migration `0011_cash_register.sql` (the
 * `UNIQUE(business_date)` constraint and the two `BEFORE` triggers) and are
 * never reimplemented here — this only translates their rejections.
 */
export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE =
  "No se pudo completar la operación de caja. Intentá de nuevo.";

export function mapCashError(error: PostgresLikeError): string {
  const message = error.message ?? "";

  if (
    error.code === "23505" ||
    message.includes("cash_sessions_business_date_key")
  ) {
    return "Ya existe una caja para hoy.";
  }
  if (message.includes("cash_session_not_open")) {
    return "La caja de esa fecha no está abierta.";
  }
  if (message.includes("cash_session_already_closed")) {
    return "La caja ya fue cerrada y no puede modificarse.";
  }
  if (message.includes("cash_session_count_required")) {
    return "Ingresá el monto contado para poder cerrar la caja.";
  }
  return GENERIC_MESSAGE;
}
