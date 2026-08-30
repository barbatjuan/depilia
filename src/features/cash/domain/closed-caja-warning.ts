/**
 * The "warn, don't block" rule for cash recorded with no open session (spec:
 * "cash-register / Closed-caja warning is non-blocking"; design decision 5).
 * Kept as one pure function so the payment path and the expense path share it
 * instead of duplicating the check. A cash payment or cash expense MUST still
 * succeed with no open session — this only produces the advisory text.
 */
export const CLOSED_CAJA_WARNING =
  "Registraste efectivo sin una caja abierta para hoy. Abrí la caja para que el arqueo cierre.";

export function cashWithoutOpenSession(input: {
  method: string;
  openSession: { id: string } | null;
}): string | null {
  if (input.method !== "cash") return null;
  if (input.openSession !== null) return null;
  return CLOSED_CAJA_WARNING;
}
