import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  deriveSaleBalance,
  type SaleBalance,
} from "@/features/sales/domain/sale-balance";

export type SaleDiscountInfo = {
  listTotal: number;
  discountAmount: number;
  discountReason: string | null;
  /** Promotion name or discount-code label when the discount came from one. */
  discountSource: string | null;
  /** Promotion name when the sale was sold through a promotion (`promotion_id`), regardless of any discount. */
  promotionName: string | null;
};

export type SaleListRow = {
  id: string;
  clientId: string;
  clientName: string;
  description: string;
  soldAt: string;
  status: string;
  balance: SaleBalance;
  discount: SaleDiscountInfo;
};

type RawDiscountShape = {
  total: number;
  list_total: number | null;
  discount_amount: number | null;
  discount_reason: string | null;
  promotions?: { name: string } | null;
  discount_codes?: { code: string } | null;
};

function toDiscountInfo(row: RawDiscountShape): SaleDiscountInfo {
  return {
    listTotal: row.list_total ?? row.total,
    discountAmount: row.discount_amount ?? 0,
    discountReason: row.discount_reason ?? null,
    discountSource:
      row.promotions?.name ??
      (row.discount_codes?.code ? `Código ${row.discount_codes.code}` : null),
    promotionName: row.promotions?.name ?? null,
  };
}

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
      "id, client_id, description, total, list_total, discount_amount, discount_reason, sold_at, status, clients(first_name, last_name), promotions(name), discount_codes(code), payments(amount)",
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
    discount: toDiscountInfo(row as unknown as RawDiscountShape),
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
  discount: SaleDiscountInfo;
  payments: SalePaymentRow[];
  vatRate: number;
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
      "id, client_id, description, total, list_total, discount_amount, discount_reason, vat_rate, sold_at, status, clients(first_name, last_name), promotions(name), discount_codes(code), payments(id, amount, paid_at, method, note)",
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
    discount: toDiscountInfo(data as unknown as RawDiscountShape),
    payments,
    vatRate: data.vat_rate,
  };
}
