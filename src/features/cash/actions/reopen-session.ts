"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { reopenSession } from "@/features/cash/data/cash-session";
import { mapCashError } from "@/features/cash/domain/cash-errors";
import type { CashActionState } from "@/features/cash/actions/open-session";

/**
 * Server action backing the "reabrir caja" button on the closed-caja screen.
 * Bound with the session id via `.bind(null, sessionId)`. The `closed -> open`
 * transition and the snapshot reset are the close trigger's job (migration
 * `0017`); any rejection is mapped to Spanish before reaching the UI.
 */
export async function reopenSessionAction(
  sessionId: string,
): Promise<CashActionState> {
  const supabase = await createSupabaseClient();

  try {
    await reopenSession(supabase, sessionId);
  } catch (error) {
    return { error: mapCashError(error as { code?: string; message?: string }) };
  }

  revalidatePath("/caja");
  return { error: null };
}
