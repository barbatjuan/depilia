"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { openSessionSchema } from "@/features/cash/schema";
import { openSession } from "@/features/cash/data/cash-session";
import { mapCashError } from "@/features/cash/domain/cash-errors";

export type CashActionState = { error: string | null };

/**
 * Server action backing the "abrir caja" form. Re-validates shape with
 * `openSessionSchema`, then inserts — the `UNIQUE(business_date)` constraint
 * in migration `0011` is what rejects a second caja for the day, and
 * `mapCashError` turns that into a Spanish message.
 */
export async function openSessionAction(
  _prevState: CashActionState,
  formData: FormData,
): Promise<CashActionState> {
  const parsed = openSessionSchema.safeParse({
    businessDate: formData.get("businessDate"),
    openingAmount: formData.get("openingAmount"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos de la apertura.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  try {
    await openSession(supabase, parsed.data);
  } catch (error) {
    return { error: mapCashError(error as { code?: string; message?: string }) };
  }

  revalidatePath("/caja");
  return { error: null };
}
