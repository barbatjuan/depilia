import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  getClinicDayBounds,
} from "@/features/dashboard/domain/schedule";

/**
 * Read side of the live theoretical balance (spec: "cash-register /
 * Theoretical balance derivation"). `getTheoretical` reads the
 * `cash_session_theoretical` view — the authority for an open session — while
 * `listTodayCashPayments` / `listCashExpensesForDate` return the raw cash rows
 * the pure `deriveTheoreticalCash` renders from and the "cobros en efectivo de
 * hoy" panel displays. Card/transfer are filtered out here.
 */
export type TheoreticalRow = {
  sessionId: string;
  businessDate: string;
  openingAmount: number;
  cashPayments: number;
  movementsNet: number;
  cashExpenses: number;
  theoretical: number;
};

export async function getTheoretical(
  supabase: AppSupabaseClient,
  sessionId: string,
): Promise<TheoreticalRow | null> {
  const { data, error } = await supabase
    .from("cash_session_theoretical")
    .select(
      "session_id, business_date, opening_amount, cash_payments, movements_net, cash_expenses, theoretical_amount",
    )
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    sessionId: data.session_id as string,
    businessDate: data.business_date as string,
    openingAmount: Number(data.opening_amount),
    cashPayments: Number(data.cash_payments),
    movementsNet: Number(data.movements_net),
    cashExpenses: Number(data.cash_expenses),
    theoretical: Number(data.theoretical_amount),
  };
}

export type TodayCashPayment = {
  id: string;
  amount: number;
  paidAt: string;
  note: string | null;
  saleId: string | null;
  saleDescription: string | null;
  clientName: string | null;
};

export async function listTodayCashPayments(
  supabase: AppSupabaseClient,
  now: Date,
): Promise<TodayCashPayment[]> {
  const { start, end } = getClinicDayBounds(now);
  const { data, error } = await supabase
    .from("payments")
    .select(
      "id, amount, paid_at, note, sale_id, sales(id, description, clients(first_name, last_name))",
    )
    .eq("method", "cash")
    .gte("paid_at", start.toISOString())
    .lt("paid_at", end.toISOString())
    .order("paid_at", { ascending: false });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const sale = Array.isArray(row.sales) ? row.sales[0] : row.sales;
    const client = sale
      ? Array.isArray(sale.clients)
        ? sale.clients[0]
        : sale.clients
      : null;
    return {
      id: row.id,
      amount: Number(row.amount),
      paidAt: row.paid_at,
      note: row.note,
      saleId: row.sale_id ?? sale?.id ?? null,
      saleDescription: sale?.description ?? null,
      clientName: client
        ? `${client.first_name} ${client.last_name}`
        : null,
    };
  });
}

export type CashExpense = { id: string; amount: number };

export async function listCashExpensesForDate(
  supabase: AppSupabaseClient,
  businessDate: string,
): Promise<CashExpense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("id, amount")
    .eq("method", "cash")
    .eq("spent_on", businessDate)
    .order("spent_on", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: row.id, amount: Number(row.amount) }));
}
