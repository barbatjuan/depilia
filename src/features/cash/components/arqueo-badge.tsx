"use client";

import { Badge } from "@/components/ui/badge";
import { ARQUEO_LABEL, type ArqueoStatus } from "@/features/cash/domain/arqueo";
import { formatMoney } from "@/lib/money";
import { useMoneyFormat } from "@/components/money-format-provider";

const STATUS_VARIANT: Record<ArqueoStatus, "default" | "secondary" | "destructive"> = {
  sobrante: "default",
  faltante: "destructive",
  exacto: "secondary",
};

/**
 * Renders the end-of-day arqueo outcome (spec: "cash-register / Closing
 * arqueo") — sobrante / faltante / caja cuadrada — driven only by the stored
 * `difference` snapshot, mirroring `SaleStatusBadge`.
 */
export function ArqueoBadge({
  status,
  difference,
}: {
  status: ArqueoStatus;
  difference: number;
}) {
  const moneyFormat = useMoneyFormat();
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]}>{ARQUEO_LABEL[status]}</Badge>
      {status !== "exacto" ? (
        <span className="text-sm font-medium tabular-nums">
          {formatMoney(Math.abs(difference), moneyFormat)}
        </span>
      ) : null}
    </span>
  );
}
