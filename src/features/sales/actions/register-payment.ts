"use server";

import { revalidatePath } from "next/cache";
import { formatInTimeZone } from "date-fns-tz";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { registerPaymentSchema } from "@/features/sales/schema";
import { registerPayment } from "@/features/sales/data/payments";
import { mapPaymentError } from "@/features/sales/domain/payment-errors";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";
import { getSessionForDate } from "@/features/cash/data/cash-session";
import { cashWithoutOpenSession } from "@/features/cash/domain/closed-caja-warning";

export type RegisterPaymentFormState = {
  error: string | null;
  warning?: string | null;
};

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

  // Non-blocking: the payment is already committed. A cash payment with no
  // open caja for today still succeeds — we only surface an advisory so the
  // operator knows the arqueo will not see it (design decision 5). Any
  // failure of this check is swallowed so the golden path cannot regress.
  let warning: string | null = null;
  if (parsed.data.method === "cash") {
    try {
      const businessDate = formatInTimeZone(
        new Date(),
        CLINIC_TZ,
        "yyyy-MM-dd",
      );
      const openSession = await getSessionForDate(supabase, businessDate);
      warning = cashWithoutOpenSession({
        method: parsed.data.method,
        openSession,
      });
    } catch {
      warning = null;
    }
  }

  revalidatePath("/ventas");
  revalidatePath(`/ventas/${saleId}`);
  return { error: null, warning };
}
