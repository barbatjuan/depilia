import { Badge } from "@/components/ui/badge";
import { ARQUEO_LABEL, type ArqueoStatus } from "@/features/cash/domain/arqueo";

const STATUS_VARIANT: Record<ArqueoStatus, "default" | "secondary" | "destructive"> = {
  sobrante: "default",
  faltante: "destructive",
  exacto: "secondary",
};

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

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
  return (
    <span className="inline-flex items-center gap-2">
      <Badge variant={STATUS_VARIANT[status]}>{ARQUEO_LABEL[status]}</Badge>
      {status !== "exacto" ? (
        <span className="text-sm font-medium tabular-nums">
          {currencyFormatter.format(Math.abs(difference))}
        </span>
      ) : null}
    </span>
  );
}
