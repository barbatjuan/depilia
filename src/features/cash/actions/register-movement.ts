"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { movementSchema } from "@/features/cash/schema";
import { createMovement } from "@/features/cash/data/cash-movements";
import { directionForKind, type MovementKind } from "@/features/cash/domain/movement";
import { mapCashError } from "@/features/cash/domain/cash-errors";
import type { CashActionState } from "@/features/cash/actions/open-session";

/**
 * Server action backing the "registrar movimiento" form. Bound with the
 * session id via `.bind(null, sessionId)`. `directionForKind` pins the
 * direction for `ingreso`/`retiro` and honours the operator's choice for a
 * bidirectional `ajuste`; the "open session only" rule is the
 * `cash_movements_require_open_session` trigger's job (migration `0011`).
 */
export async function registerMovementAction(
  sessionId: string,
  _prevState: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const kind = formData.get("kind") as MovementKind | null;
  const chosen = formData.get("direction");

  let direction: string | null;
  try {
    direction = kind
      ? directionForKind(
          kind,
          chosen === "in" || chosen === "out" ? chosen : undefined,
        )
      : null;
  } catch (error) {
    return { error: (error as Error).message };
  }

  const parsed = movementSchema.safeParse({
    sessionId,
    kind,
    direction,
    amount: formData.get("amount"),
    reason: formData.get("reason"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del movimiento.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  try {
    await createMovement(supabase, parsed.data);
  } catch (error) {
    return { error: mapCashError(error as { code?: string; message?: string }) };
  }

  revalidatePath("/caja");
  return { error: null };
}
