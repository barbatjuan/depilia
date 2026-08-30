import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { MovementInput } from "@/features/cash/schema";
import type {
  MovementDirection,
  MovementKind,
} from "@/features/cash/domain/movement";

/**
 * Data layer for `cash_movements` (spec: "cash-register / Cash movements").
 * The "movement only on an open session" rule is the
 * `cash_movements_require_open_session` trigger's job (migration `0011`); this
 * layer just surfaces whatever the DB rejects.
 */
export type CashMovementRow = {
  id: string;
  sessionId: string;
  kind: MovementKind;
  direction: MovementDirection;
  amount: number;
  reason: string;
  createdAt: string;
};

const SELECT_COLUMNS =
  "id, session_id, kind, direction, amount, reason, created_at";

type RawCashMovement = {
  id: string;
  session_id: string;
  kind: string;
  direction: string;
  amount: number;
  reason: string;
  created_at: string;
};

function toRow(row: RawCashMovement): CashMovementRow {
  return {
    id: row.id,
    sessionId: row.session_id,
    kind: row.kind as MovementKind,
    direction: row.direction as MovementDirection,
    amount: Number(row.amount),
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export async function listMovements(
  supabase: AppSupabaseClient,
  sessionId: string,
): Promise<CashMovementRow[]> {
  const { data, error } = await supabase
    .from("cash_movements")
    .select(SELECT_COLUMNS)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => toRow(row as RawCashMovement));
}

export async function createMovement(
  supabase: AppSupabaseClient,
  input: MovementInput,
): Promise<CashMovementRow> {
  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
      session_id: input.sessionId,
      kind: input.kind,
      direction: input.direction,
      amount: input.amount,
      reason: input.reason,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toRow(data as RawCashMovement);
}

export async function deleteMovement(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("cash_movements").delete().eq("id", id);
  if (error) throw error;
}
