import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { monthRange } from "@/features/accounting/domain/period";
import type { IncomeSaleInput } from "@/features/accounting/domain/income-report";

export type IncomeReportSale = IncomeSaleInput & {
  clientId: string;
  soldAt: string;
};
export type IncomeReportPayment = { amount: number; method: string };

export type IncomeReport = {
  sales: IncomeReportSale[];
  payments: IncomeReportPayment[];
};

/**
 * The month's devengado sales (for the type/VAT breakdown and business
 * metrics) plus its cobrado payments (for the payment-mix panel) — same
 * "sales!inner(status)" open-only filter as the rest of accounting.
 */
export async function getIncomeReport(
  supabase: AppSupabaseClient,
  monthKey: string,
): Promise<IncomeReport> {
  const range = monthRange(monthKey);

  const [salesResult, paymentsResult] = await Promise.all([
    supabase
      .from("sales")
      .select("client_id, total, vat_rate, client_package_id, promotion_id, sold_at")
      .eq("status", "open")
      .gte("sold_at", range.startUtc)
      .lt("sold_at", range.endUtc),
    supabase
      .from("payments")
      .select("amount, method, sales!inner(status)")
      .eq("sales.status", "open")
      .gte("paid_at", range.startUtc)
      .lt("paid_at", range.endUtc),
  ]);
  if (salesResult.error) throw salesResult.error;
  if (paymentsResult.error) throw paymentsResult.error;

  return {
    sales: (salesResult.data ?? []).map((row) => ({
      clientId: row.client_id,
      total: row.total,
      vatRate: row.vat_rate,
      clientPackageId: row.client_package_id,
      promotionId: row.promotion_id,
      soldAt: row.sold_at,
    })),
    payments: (paymentsResult.data ?? []).map((row) => ({
      amount: row.amount,
      method: row.method,
    })),
  };
}
