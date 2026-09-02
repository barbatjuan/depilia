export type PaymentMethod = "cash" | "card" | "transfer" | "other";

export type PaymentMixSlice = {
  method: PaymentMethod;
  label: string;
  total: number;
  pct: number;
};

type PaymentInput = { amount: number | string; method: string };

const METHOD_ORDER: PaymentMethod[] = ["cash", "card", "transfer", "other"];

const METHOD_LABEL: Record<PaymentMethod, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

function normalize(method: string): PaymentMethod {
  return (METHOD_ORDER as string[]).includes(method)
    ? (method as PaymentMethod)
    : "other";
}

/**
 * Payment totals grouped by method, in fixed method order, dropping methods
 * with no payments. `pct` is a whole-number share of the grand total.
 * Pure — `get-payment-mix` fetches the rows.
 */
export function buildPaymentMix(payments: PaymentInput[]): PaymentMixSlice[] {
  const totals = new Map<PaymentMethod, number>();

  for (const payment of payments) {
    const method = normalize(payment.method);
    totals.set(method, (totals.get(method) ?? 0) + Number(payment.amount));
  }

  const grand = [...totals.values()].reduce((sum, n) => sum + n, 0);
  if (grand === 0) return [];

  return METHOD_ORDER.filter((method) => (totals.get(method) ?? 0) > 0).map(
    (method) => {
      const total = totals.get(method) ?? 0;
      return {
        method,
        label: METHOD_LABEL[method],
        total,
        pct: Math.round((total / grand) * 100),
      };
    },
  );
}
