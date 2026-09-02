/**
 * End-of-day arqueo reconciliation (spec: "cash-register / Closing arqueo").
 * `difference = counted - theoretical`. A positive difference is a `sobrante`
 * (more cash than expected), negative is a `faltante`, and a gap smaller than
 * half a cent is treated as `exacto` so numeric(12,2) rounding never shows a
 * spurious discrepancy.
 */
export type ArqueoStatus = "sobrante" | "faltante" | "exacto";

const EXACTO_EPSILON = 0.005;

export const ARQUEO_LABEL: Record<ArqueoStatus, string> = {
  sobrante: "Sobrante",
  faltante: "Faltante",
  exacto: "Caja cuadrada",
};

export function deriveArqueo(
  counted: number,
  theoretical: number,
): { difference: number; status: ArqueoStatus } {
  const difference = counted - theoretical;
  if (Math.abs(difference) < EXACTO_EPSILON) {
    return { difference: 0, status: "exacto" };
  }
  return {
    difference,
    status: difference > 0 ? "sobrante" : "faltante",
  };
}

/**
 * Classifies an already-stored `cash_sessions.difference` (no recompute) —
 * used by the monthly cash report (PASO 5), which reads each closed
 * session's frozen difference rather than re-deriving it from theoretical vs
 * counted. Same epsilon as `deriveArqueo` so the two never disagree.
 */
export function classifyArqueoDifference(difference: number): ArqueoStatus {
  if (Math.abs(difference) < EXACTO_EPSILON) return "exacto";
  return difference > 0 ? "sobrante" : "faltante";
}
