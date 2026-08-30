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
