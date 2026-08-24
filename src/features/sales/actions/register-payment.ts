"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { registerPaymentSchema } from "@/features/sales/schema";
import { registerPayment } from "@/features/sales/data/payments";
import { mapPaymentError } from "@/features/sales/domain/payment-errors";

export type RegisterPaymentFormState = { error: string | null };

/**
 * Server action backing the "registrar pago" form on the sale detail page.
 * Bound with the sale id via `.bind(null, saleId)`. Re-validates shape with
 * `registerPaymentSchema` server-side, then persists — the overpayment
 * ceiling itself is the DB trigger's job (design decision 5); any rejection
 * it raises is mapped to a friendly Spanish message before reaching the UI.
 */
export async function registerPaymentAction(
  saleId: string,
  _prevState: RegisterPaymentFormState,
  formData: FormData,
): Promise<RegisterPaymentFormState> {
  const parsed = registerPaymentSchema.safeParse({
    saleId,
    amount: formData.get("amount"),
    method: formData.get("method"),
    note: formData.get("note"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del pago.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  try {
    await registerPayment(supabase, parsed.data);
  } catch (error) {
    return { error: mapPaymentError(error as { message?: string | null }) };
  }

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${saleId}`);
  return { error: null };
}
