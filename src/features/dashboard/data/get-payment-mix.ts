import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  buildPaymentMix,
  type PaymentMixSlice,
} from "@/features/dashboard/domain/payment-mix";

const DAYS = 30;

/**
 * Payment total by method over the last 30 days — backs the "Mix de cobros"
 * bar. Empty array = no payments in the window (a correct empty state).
 */
export async function getPaymentMix(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<PaymentMixSlice[]> {
  const since = new Date(
    now.getTime() - DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { data, error } = await supabase
    .from("payments")
    .select("amount, method")
    .gte("paid_at", since);
  if (error) throw error;

  return buildPaymentMix(
    (data ?? []).map((row) => ({ amount: row.amount, method: row.method })),
  );
}
