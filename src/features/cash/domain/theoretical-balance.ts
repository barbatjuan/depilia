import { signedAmount, type MovementDirection } from "@/features/cash/domain/movement";

/**
 * Pure derivation of a cash session's live theoretical drawer balance (spec:
 * "cash-register / Theoretical balance derivation"; design decision 2). This
 * mirrors the `cash_session_theoretical` SQL view's formula EXACTLY:
 *
 *   opening_amount
 *     + sum(cash payments in the BA-day window)
 *     + sum(signed cash movements)
 *     - sum(cash expenses for the business_date)
 *
 * Only `method = 'cash'` rows reach here — card/transfer are filtered by the
 * data layer and reported separately. The `parity.test.ts` integration test
 * asserts this function, the view, and the close trigger all agree.
 */
export type TheoreticalCashInput = {
  openingAmount: number;
  cashPayments: { amount: number }[];
  movements: { direction: MovementDirection; amount: number }[];
  cashExpenses: { amount: number }[];
};

export type TheoreticalCash = {
  openingAmount: number;
  cashIn: number;
  movementsNet: number;
  cashOut: number;
  theoretical: number;
};

export function deriveTheoreticalCash(input: TheoreticalCashInput): TheoreticalCash {
  const cashIn = sum(input.cashPayments.map((p) => p.amount));
  const movementsNet = input.movements.reduce(
    (net, movement) => net + signedAmount(movement),
    0,
  );
  const cashOut = sum(input.cashExpenses.map((e) => e.amount));
  const theoretical =
    input.openingAmount + cashIn + movementsNet - cashOut;

  return {
    openingAmount: input.openingAmount,
    cashIn,
    movementsNet,
    cashOut,
    theoretical,
  };
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}
