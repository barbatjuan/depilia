export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo registrar el pago. Intentá de nuevo.";

/**
 * Maps a raw Postgres/PostgREST error into a friendly Spanish message —
 * never lets the overpayment trigger's raw exception text reach the UI. The
 * `payments_reject_overpayment` trigger (migration `0006_sales_payments.sql`,
 * already built and tested in PR1) is never reimplemented here; this only
 * translates its `payment_exceeds_balance` exception into something a staff
 * member can act on.
 */
export function mapPaymentError(error: PostgresLikeError): string {
  if (error.message?.includes("payment_exceeds_balance")) {
    return "Ese pago supera el saldo pendiente de la venta. Revisá el monto e intentá de nuevo.";
  }
  return GENERIC_MESSAGE;
}
