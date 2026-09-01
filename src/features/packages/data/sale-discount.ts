import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { currencyFractionDigits } from "@/features/promotions/domain/discount";
import type { SaleDiscountInput } from "@/features/packages/domain/sell-package";

/**
 * Turns the parsed manual-discount form fields into the `SaleDiscountInput`
 * the pure payload builders expect, resolving the acting staff id
 * (`discounted_by`) the same way the caja triggers do — via
 * `public.current_staff_id()` (migration `0011`) — and the clinic currency's
 * fraction digits for rounding. Returns `null` when no discount was entered.
 */
export async function resolveDiscountInput(
  supabase: AppSupabaseClient,
  raw: {
    discountKind: "" | "percent" | "fixed";
    discountValue: "" | number;
    discountReason: string;
  },
): Promise<SaleDiscountInput | null> {
  const value = typeof raw.discountValue === "number" ? raw.discountValue : 0;
  if (
    (raw.discountKind !== "percent" && raw.discountKind !== "fixed") ||
    value <= 0
  ) {
    return null;
  }

  const [staffResult, moneyFormat] = await Promise.all([
    supabase.rpc("current_staff_id"),
    getMoneyFormat(supabase),
  ]);

  return {
    kind: raw.discountKind,
    value,
    reason: raw.discountReason,
    by: (staffResult.data as string | null) ?? null,
    fractionDigits: currencyFractionDigits(moneyFormat.currency),
  };
}
