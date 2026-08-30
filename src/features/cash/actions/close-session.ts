"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { closeSessionSchema } from "@/features/cash/schema";
import { closeSession } from "@/features/cash/data/cash-session";
import { mapCashError } from "@/features/cash/domain/cash-errors";
import type { CashActionState } from "@/features/cash/actions/open-session";

/**
 * Server action backing the "cerrar caja" form. Bound with the session id via
 * `.bind(null, sessionId)`. The theoretical/difference snapshot and the
 * "counted_amount required" rule are the close trigger's job (migration
 * `0011`); any rejection is mapped to Spanish before reaching the UI.
 */
export async function closeSessionAction(
  sessionId: string,
  _prevState: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const parsed = closeSessionSchema.safeParse({
    sessionId,
    countedAmount: formData.get("countedAmount"),
    closingNote: formData.get("closingNote"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del cierre.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  try {
    await closeSession(supabase, parsed.data);
  } catch (error) {
    return { error: mapCashError(error as { code?: string; message?: string }) };
  }

  revalidatePath("/caja");
  return { error: null };
}
