import { CreditCard } from "lucide-react";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { PaymentMixSlice } from "@/features/dashboard/domain/payment-mix";
import { ChartCard } from "@/features/dashboard/components/charts/chart-card";

// Fixed categorical slots (validated blue/orange/aqua + violet — dataviz skill).
const SLOT_VAR: Record<string, string> = {
  cash: "var(--chart-2)",
  card: "var(--chart-3)",
  transfer: "var(--chart-4)",
  other: "var(--chart-5)",
};

export function PaymentMixChart({
  data,
  moneyFormat,
}: {
  data: PaymentMixSlice[];
  moneyFormat: MoneyFormat;
}) {
  const total = data.reduce((sum, s) => sum + s.total, 0);

  return (
    <ChartCard
      title="Mix de cobros"
      description="Por medio de pago · últimos 30 días"
      icon={CreditCard}
      figure={total > 0 ? formatMoney(total, moneyFormat) : undefined}
    >
      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Sin cobros registrados en el período.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <div
            className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full"
            role="img"
            aria-label={`Distribución de cobros: ${data
              .map((s) => `${s.label} ${s.pct}%`)
              .join(", ")}`}
          >
            {data.map((slice) => (
              <div
                key={slice.method}
                title={`${slice.label} — ${formatMoney(slice.total, moneyFormat)} (${slice.pct}%)`}
                style={{
                  width: `${slice.pct}%`,
                  background: SLOT_VAR[slice.method],
                }}
              />
            ))}
          </div>
          <ul className="flex flex-col gap-2 text-sm">
            {data.map((slice) => (
              <li key={slice.method} className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ background: SLOT_VAR[slice.method] }}
                />
                <span className="text-muted-foreground">{slice.label}</span>
                <span className="tnum ml-auto font-medium text-foreground">
                  {formatMoney(slice.total, moneyFormat)}
                </span>
                <span className="tnum w-10 text-right text-muted-foreground">
                  {slice.pct}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </ChartCard>
  );
}
