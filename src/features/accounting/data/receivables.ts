import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { deriveSaleBalance } from "@/features/sales/domain/sale-balance";
import type { ReceivableSaleRow } from "@/features/accounting/domain/receivables";

/**
 * Open sales with a balance still owed, one row per sale (spec: PASO 6).
 * Deliberately NOT the `sale_balances` view — it has no `status` column and
 * includes void sales, same reasoning as `listSales`.
 */
export async function getReceivables(
  supabase: AppSupabaseClient,
): Promise<ReceivableSaleRow[]> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, client_id, sold_at, total, clients(first_name, last_name), payments(amount)",
    )
    .eq("status", "open");
  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const balance = deriveSaleBalance(row.total, row.payments ?? []).balance;
      return {
        clientId: row.client_id,
        clientName: row.clients
          ? `${row.clients.first_name} ${row.clients.last_name}`
          : "Cliente desconocido",
        saleId: row.id,
        balance,
        soldAt: row.sold_at,
      };
    })
    .filter((row) => row.balance > 0);
}

/** Total owed across every client — for the dashboard/contabilidad header stat. */
export async function getReceivablesTotal(
  supabase: AppSupabaseClient,
): Promise<number> {
  const rows = await getReceivables(supabase);
  return rows.reduce((sum, row) => sum + row.balance, 0);
}
