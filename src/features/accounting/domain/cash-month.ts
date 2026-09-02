import { classifyArqueoDifference } from "@/features/cash/domain/arqueo";
import type { MovementDirection } from "@/features/cash/domain/movement";

export type CashMonthSession = {
  status: "open" | "closed";
  difference: number | null;
};

export type CashMonthMovement = {
  direction: MovementDirection;
  amount: number;
};

export type CashMonthSummary = {
  closedDays: number;
  openDays: number;
  arqueoNet: number;
  arqueoAbs: number;
  sobrantes: number;
  faltantes: number;
  exactos: number;
  manualIn: number;
  manualOut: number;
};

/**
 * Monthly caja rollup (spec: PASO 5.2). Reuses each closed session's already
 * -frozen `difference` (no re-derivation) and classifies it with the same
 * epsilon as the daily arqueo. `manualIn`/`manualOut` are `cash_movements`
 * only — sales/expenses already show up in the P&L, this is just the
 * operator-entered retiros/ingresos/ajustes.
 */
export function buildCashMonthSummary({
  sessions,
  movements,
}: {
  sessions: CashMonthSession[];
  movements: CashMonthMovement[];
}): CashMonthSummary {
  let closedDays = 0;
  let openDays = 0;
  let arqueoNet = 0;
  let arqueoAbs = 0;
  let sobrantes = 0;
  let faltantes = 0;
  let exactos = 0;

  for (const session of sessions) {
    if (session.status !== "closed") {
      openDays += 1;
      continue;
    }
    closedDays += 1;
    const diff = session.difference ?? 0;
    arqueoNet += diff;
    arqueoAbs += Math.abs(diff);
    const status = classifyArqueoDifference(diff);
    if (status === "sobrante") sobrantes += 1;
    else if (status === "faltante") faltantes += 1;
    else exactos += 1;
  }

  const manualIn = movements
    .filter((m) => m.direction === "in")
    .reduce((sum, m) => sum + m.amount, 0);
  const manualOut = movements
    .filter((m) => m.direction === "out")
    .reduce((sum, m) => sum + m.amount, 0);

  return {
    closedDays,
    openDays,
    arqueoNet,
    arqueoAbs,
    sobrantes,
    faltantes,
    exactos,
    manualIn,
    manualOut,
  };
}
