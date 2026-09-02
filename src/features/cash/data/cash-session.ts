import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type {
  CloseSessionInput,
  OpenSessionInput,
} from "@/features/cash/schema";

/**
 * Data layer for `cash_sessions` (spec: "cash-register / Daily session
 * lifecycle"). Takes an injected `AppSupabaseClient` so RSC pages and server
 * actions supply their own request-scoped client. `opened_by` is stamped by
 * the `current_staff_id()` column default in migration `0011`, not here.
 */
export type CashSessionRow = {
  id: string;
  businessDate: string;
  status: "open" | "closed";
  openingAmount: number;
  openedAt: string;
  countedAmount: number | null;
  theoreticalAmount: number | null;
  difference: number | null;
  closingNote: string | null;
  closedAt: string | null;
};

const SELECT_COLUMNS =
  "id, business_date, status, opening_amount, opened_at, counted_amount, theoretical_amount, difference, closing_note, closed_at";

type RawCashSession = {
  id: string;
  business_date: string;
  status: string;
  opening_amount: number;
  opened_at: string;
  counted_amount: number | null;
  theoretical_amount: number | null;
  difference: number | null;
  closing_note: string | null;
  closed_at: string | null;
};

function toRow(row: RawCashSession): CashSessionRow {
  return {
    id: row.id,
    businessDate: row.business_date,
    status: row.status as "open" | "closed",
    openingAmount: Number(row.opening_amount),
    openedAt: row.opened_at,
    countedAmount: row.counted_amount === null ? null : Number(row.counted_amount),
    theoreticalAmount:
      row.theoretical_amount === null ? null : Number(row.theoretical_amount),
    difference: row.difference === null ? null : Number(row.difference),
    closingNote: row.closing_note,
    closedAt: row.closed_at,
  };
}

export async function getSessionForDate(
  supabase: AppSupabaseClient,
  businessDate: string,
): Promise<CashSessionRow | null> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SELECT_COLUMNS)
    .eq("business_date", businessDate)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as RawCashSession) : null;
}

export async function getOpenSession(
  supabase: AppSupabaseClient,
): Promise<CashSessionRow | null> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SELECT_COLUMNS)
    .eq("status", "open")
    .order("business_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data ? toRow(data as RawCashSession) : null;
}

export async function listSessions(
  supabase: AppSupabaseClient,
  limit = 30,
): Promise<CashSessionRow[]> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SELECT_COLUMNS)
    .order("business_date", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row) => toRow(row as RawCashSession));
}

/**
 * Sessions whose `business_date` falls in `[from, to)` — backs the monthly
 * cash report (PASO 5). Ascending so the arqueo history reads chronologically.
 */
export async function listSessionsInRange(
  supabase: AppSupabaseClient,
  from: string,
  to: string,
): Promise<CashSessionRow[]> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .select(SELECT_COLUMNS)
    .gte("business_date", from)
    .lt("business_date", to)
    .order("business_date", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => toRow(row as RawCashSession));
}

export async function openSession(
  supabase: AppSupabaseClient,
  input: OpenSessionInput,
): Promise<CashSessionRow> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .insert({
      business_date: input.businessDate,
      opening_amount: input.openingAmount,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toRow(data as RawCashSession);
}

/**
 * Re-opens a caja that was closed (spec: "cash-register", migration `0017`).
 * The `closed -> open` transition is handled by the close-snapshot trigger,
 * which clears `counted_amount` / `theoretical_amount` / `difference` /
 * `closed_at`; a later close recomputes the arqueo.
 */
export async function reopenSession(
  supabase: AppSupabaseClient,
  sessionId: string,
): Promise<CashSessionRow> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .update({ status: "open" })
    .eq("id", sessionId)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toRow(data as RawCashSession);
}

export async function closeSession(
  supabase: AppSupabaseClient,
  input: CloseSessionInput,
): Promise<CashSessionRow> {
  const { data, error } = await supabase
    .from("cash_sessions")
    .update({
      status: "closed",
      counted_amount: input.countedAmount,
      closing_note: input.closingNote || null,
    })
    .eq("id", input.sessionId)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toRow(data as RawCashSession);
}
