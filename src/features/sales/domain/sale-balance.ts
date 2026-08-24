export type SalePaymentInput = { amount: number };

export type SaleBalanceStatus = "paid" | "partial" | "unpaid";

export type SaleBalance = {
  total: number;
  paid: number;
  balance: number;
  status: SaleBalanceStatus;
};

export const STATUS_LABEL: Record<SaleBalanceStatus, string> = {
  paid: "Pagado",
  partial: "Parcial",
  unpaid: "Sin pagar",
};

/**
 * Pure derivation of a sale's balance owed and payment status (spec:
 * "sales-and-payments / Balance owed is derived, never stored"; design
 * decision 5). Mirrors the `sale_balances` SQL view's formula (`total -
 * sum(payments)`) so the UI and the DB never disagree — this is never a
 * mutable column, it is recomputed from the sale total and its payment
 * history every time.
 */
export function deriveSaleBalance(
  total: number,
  payments: SalePaymentInput[],
): SaleBalance {
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = total - paid;
  const status: SaleBalanceStatus =
    paid <= 0 ? "unpaid" : balance <= 0 ? "paid" : "partial";

  return { total, paid, balance, status };
}
