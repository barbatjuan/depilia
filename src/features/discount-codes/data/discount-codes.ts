import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { DiscountKind } from "@/features/promotions/domain/discount";
import type { DiscountCodeReason } from "@/features/promotions/domain/discount-errors";

export type ValidateDiscountCodeResult =
  | { ok: true; row: { id: string; kind: DiscountKind; value: number } }
  | { ok: false; reason: DiscountCodeReason };

/**
 * Advisory checkout pre-check for a discount code (spec: "discount-codes /
 * Checkout validation"). Case-insensitive lookup (the `code` column is
 * `citext`), then re-checks `active`, the BA business-date window, and
 * `used_count < max_uses`. This is only a courtesy so the operator sees a
 * Spanish message instead of a raw constraint error — the real, atomic guard
 * is the `sales_apply_discount_code` BEFORE INSERT trigger, which locks the
 * row `FOR UPDATE` and increments `used_count` in the same transaction.
 *
 * `businessDate` is the `yyyy-MM-dd` BA business date at sale time, resolved
 * by the caller the same way the caja/payment flows do.
 */
export async function validateDiscountCode(
  supabase: AppSupabaseClient,
  code: string,
  businessDate: string,
): Promise<ValidateDiscountCodeResult> {
  const trimmed = code.trim();
  if (!trimmed) return { ok: false, reason: "unknown" };

  const { data, error } = await supabase
    .from("discount_codes")
    .select("id, kind, value, active, max_uses, used_count, valid_from, valid_to")
    .eq("code", trimmed)
    .order("active", { ascending: false })
    .limit(1);

  const row = data?.[0];
  if (error || !row) return { ok: false, reason: "unknown" };

  if (!row.active) return { ok: false, reason: "inactive" };

  if (
    (row.valid_from !== null && businessDate < row.valid_from) ||
    (row.valid_to !== null && businessDate > row.valid_to)
  ) {
    return { ok: false, reason: "out_of_window" };
  }

  if (row.max_uses !== null && row.used_count >= row.max_uses) {
    return { ok: false, reason: "exhausted" };
  }

  return {
    ok: true,
    row: { id: row.id, kind: row.kind as DiscountKind, value: row.value },
  };
}
