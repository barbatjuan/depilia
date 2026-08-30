"use client";

import { formatMoney } from "@/lib/money";
import { useMoneyFormat } from "@/components/money-format-provider";

/**
 * Money renderer for TanStack Table column `cell` functions. Those functions
 * are module-level closures and cannot call a hook directly, so the column def
 * returns `<MoneyCell amount={...} />` and the hook runs inside this component.
 */
export function MoneyCell({ amount }: { amount: number }) {
  const format = useMoneyFormat();
  return <>{formatMoney(amount, format)}</>;
}
