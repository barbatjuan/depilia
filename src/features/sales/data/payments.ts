import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { RegisterPaymentInput } from "@/features/sales/schema";

/**
 * Inserts one partial payment against a sale (spec: "sales-and-payments /
 * Register a partial payment" — a sale can have many partial payments over
 * time). The overpayment ceiling is enforced by the
 * `payments_reject_overpayment` trigger (migration `0006_sales_payments.sql`,
 * built in PR1) — this function does not re-check the ceiling, it only
 * surfaces whatever the DB rejects to the caller as a raw error to be mapped.
 */
export async function registerPayment(
  supabase: AppSupabaseClient,
  input: RegisterPaymentInput,
): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      sale_id: input.saleId,
      amount: input.amount,
      method: input.method,
      note: input.note || null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return { id: data.id };
}
