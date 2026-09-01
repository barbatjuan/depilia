import { formatInTimeZone } from "date-fns-tz";
import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { currencyFractionDigits } from "@/features/promotions/domain/discount";
import { discountCodeReasonMessage } from "@/features/promotions/domain/discount-errors";
import { validateDiscountCode } from "@/features/discount-codes/data/discount-codes";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";
import type { SaleDiscountInput } from "@/features/packages/domain/sell-package";

type RawDiscountFields = {
  discountKind: "" | "percent" | "fixed";
  discountValue: "" | number;
  discountReason: string;
  discountCode: string;
};

/**
 * Turns the parsed discount form fields into the `SaleDiscountInput` the pure
 * payload builders expect. Two mutually exclusive paths (the schema rejects
 * both at once):
 *
 * - **Discount code**: `validateDiscountCode` advisory pre-check against the
 *   BA business date; the resolved `kind`/`value` come from the code row and
 *   `codeId` is threaded onto the `sales` row so the
 *   `sales_apply_discount_code` trigger fires and bumps `used_count`. A
 *   rejected code throws a Spanish message.
 * - **Manual discount**: `kind`/`value`/`reason` straight from the form.
 *
 * `discounted_by` is resolved the same way the caja triggers do — via
 * `public.current_staff_id()` (migration `0011`). Returns `null` when no
 * discount was entered.
 */
export async function resolveDiscountInput(
  supabase: AppSupabaseClient,
  raw: RawDiscountFields,
): Promise<SaleDiscountInput | null> {
  const code = raw.discountCode.trim();
  const value = typeof raw.discountValue === "number" ? raw.discountValue : 0;
  const hasManual =
    (raw.discountKind === "percent" || raw.discountKind === "fixed") &&
    value > 0;

  if (!code && !hasManual) return null;

  const [staffResult, moneyFormat] = await Promise.all([
    supabase.rpc("current_staff_id"),
    getMoneyFormat(supabase),
  ]);
  const by = (staffResult.data as string | null) ?? null;
  const fractionDigits = currencyFractionDigits(moneyFormat.currency);

  if (code) {
    const businessDate = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
    const result = await validateDiscountCode(supabase, code, businessDate);
    if (!result.ok) {
      throw new Error(discountCodeReasonMessage(result.reason));
    }
    return {
      kind: result.row.kind,
      value: result.row.value,
      reason: `Código ${code.toUpperCase()}`,
      by,
      fractionDigits,
      codeId: result.row.id,
    };
  }

  return {
    kind: raw.discountKind as "percent" | "fixed",
    value,
    reason: raw.discountReason,
    by,
    fractionDigits,
  };
}
