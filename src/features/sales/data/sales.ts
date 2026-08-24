import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  deriveSaleBalance,
  type SaleBalance,
} from "@/features/sales/domain/sale-balance";

export type SaleListRow = {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  soldAt: string;
  status: string;
  balance: SaleBalance;
};

/**
 * Lists every sale (package sales and loose-session sales alike — both live
 * in the same `sales` table, see design's schema) joined to the client name,
 * with the balance owed derived from its payments, never read off a stored
 * column (design decision 5). Optionally scoped to one client, so the ficha
 * can link to "this client's sales" without a separate query shape.
 */
export async function listSales(
  supabase: AppSupabaseClient,
  params: { clientId?: string } = {},
): Promise<SaleListRow[]> {
  let query = supabase
    .from("sales")
    .select(
      "id, client_id, description, total, sold_at, status, clients(first_name, last_name), payments(amount)",
    )
    .order("sold_at", { ascending: false });

  if (params.clientId) {
    query = query.eq("client_id", params.clientId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    clientId: row.client_id,
    clientName: row.clients
      ? `${row.clients.first_name} ${row.clients.last_name}`
      : "Cliente desconocido",
    description: row.description,
    soldAt: row.sold_at,
    status: row.status,
    balance: deriveSaleBalance(row.total, row.payments ?? []),
  }));
}

export type SalePaymentRow = {
  id: string;
  amount: number;
  paidAt: string;
  method: string;
  note: string | null;
};

export type SaleDetail = {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  soldAt: string;
  status: string;
  balance: SaleBalance;
  payments: SalePaymentRow[];
};

/**
 * A single sale's full detail: description, client, and the complete payment
 * history (each installment — "pagos en cuotas" — with amount, date, and
 * method), most recent first, plus the derived balance.
 */
export async function getSale(
  supabase: AppSupabaseClient,
  id: string,
): Promise<SaleDetail | null> {
  const { data, error } = await supabase
    .from("sales")
    .select(
      "id, client_id, description, total, sold_at, status, clients(first_name, last_name), payments(id, amount, paid_at, method, note)",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const payments = (data.payments ?? [])
    .slice()
    .sort((a, b) => (a.paid_at < b.paid_at ? 1 : -1))
    .map((p) => ({
      id: p.id,
      amount: p.amount,
      paidAt: p.paid_at,
      method: p.method,
      note: p.note,
    }));

  return {
    id: data.id,
    clientId: data.client_id,
    clientName: data.clients
      ? `${data.clients.first_name} ${data.clients.last_name}`
      : "Cliente desconocido",
    description: data.description,
    soldAt: data.sold_at,
    status: data.status,
    balance: deriveSaleBalance(data.total, data.payments ?? []),
    payments,
  };
}
