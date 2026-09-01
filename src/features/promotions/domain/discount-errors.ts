export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo aplicar el descuento. Revisá los datos.";

/**
 * Maps a raw Postgres/PostgREST error raised while persisting a discounted
 * sale into a Spanish message. Matches on SQLSTATE:
 * - `23514` — the `sales_money_identity` / `discount_amount >= 0` / `total > 0`
 *   check constraints from migration `0015` (a discount that doesn't add up
 *   or leaves the sale at zero).
 *
 * P3 extends this mapper with the discount-code trigger message prefixes
 * (`discount_code_inactive` / `_out_of_window` / `_exhausted`).
 */
export function mapDiscountError(error: PostgresLikeError): string {
  if (error.code === "23514") {
    return "El descuento no es válido: la venta no puede quedar en cero o negativa.";
  }
  return GENERIC_MESSAGE;
}
