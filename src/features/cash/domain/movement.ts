/**
 * Cash movement sign math (spec: "cash-register / Cash movements"; design
 * decision 1). Every movement stores `amount > 0`; the sign is carried by a
 * `direction` column so `ajuste` — which is inherently bidirectional — needs
 * no extra kind. This one expression (`in → +amount`, `out → -amount`) is the
 * same one the `cash_session_theoretical` view and the close trigger use, and
 * the parity integration test asserts all three agree.
 */
export type MovementKind = "retiro" | "ingreso" | "ajuste";
export type MovementDirection = "in" | "out";

/**
 * The direction each kind is locked to, or `null` when the operator must
 * pick (only `ajuste`). Mirrors the `kind_matches_direction` CHECK in
 * migration `0011_cash_register.sql`.
 */
export const KIND_DIRECTION: Record<MovementKind, MovementDirection | null> = {
  ingreso: "in",
  retiro: "out",
  ajuste: null,
};

/** Signed contribution of a movement to the drawer: `in` adds, `out` subtracts. */
export function signedAmount(movement: {
  direction: MovementDirection;
  amount: number;
}): number {
  return movement.direction === "in" ? movement.amount : -movement.amount;
}

/**
 * Resolves the `direction` to persist for a movement. `ingreso`/`retiro` are
 * pinned and ignore any operator choice; `ajuste` requires an explicit
 * direction and throws without one (the UI must force the choice).
 */
export function directionForKind(
  kind: MovementKind,
  chosen?: MovementDirection,
): MovementDirection {
  const pinned = KIND_DIRECTION[kind];
  if (pinned) return pinned;
  if (!chosen) {
    throw new Error("Un ajuste necesita una dirección (ingreso o egreso).");
  }
  return chosen;
}
