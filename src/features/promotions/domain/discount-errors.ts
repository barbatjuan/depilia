export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo aplicar el descuento. Revisá los datos.";

const MONEY_IDENTITY_MESSAGE =
  "El descuento no es válido: la venta no puede quedar en cero o negativa.";

/** Advisory checkout pre-check outcomes for a discount code. */
export type DiscountCodeReason =
  | "unknown"
  | "inactive"
  | "out_of_window"
  | "exhausted";

const REASON_MESSAGE: Record<DiscountCodeReason, string> = {
  unknown: "El código de descuento no existe.",
  inactive: "El código de descuento ya no está activo.",
  out_of_window: "El código de descuento está fuera de vigencia.",
  exhausted: "El código de descuento ya alcanzó su límite de usos.",
};

/** Spanish message for a `validateDiscountCode` rejection reason. */
export function discountCodeReasonMessage(reason: DiscountCodeReason): string {
  return REASON_MESSAGE[reason] ?? GENERIC_MESSAGE;
}

/**
 * Maps a raw Postgres/PostgREST error raised while persisting a discounted
 * sale into a Spanish message. Matches on SQLSTATE:
 * - `23514` — either the `sales_money_identity` / `discount_amount >= 0` /
 *   `total > 0` check constraints from migration `0015`, OR the
 *   `sales_apply_discount_code` trigger, which `raise`s with
 *   `errcode = 'check_violation'` and a `discount_code_inactive` /
 *   `discount_code_out_of_window` / `discount_code_exhausted` message prefix
 *   (a race the JS pre-check missed).
 */
export function mapDiscountError(error: PostgresLikeError): string {
  const message = error.message ?? "";
  if (message.includes("discount_code_inactive")) {
    return REASON_MESSAGE.inactive;
  }
  if (message.includes("discount_code_out_of_window")) {
    return REASON_MESSAGE.out_of_window;
  }
  if (message.includes("discount_code_exhausted")) {
    return REASON_MESSAGE.exhausted;
  }
  if (error.code === "23514") {
    return MONEY_IDENTITY_MESSAGE;
  }
  return GENERIC_MESSAGE;
}
