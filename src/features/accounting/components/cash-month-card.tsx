import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { CashMonthSummary } from "@/features/accounting/domain/cash-month";
import { StatRow } from "./stat-row";

export function CashMonthCard({
  summary,
  moneyFormat,
}: {
  summary: CashMonthSummary;
  moneyFormat: MoneyFormat;
}) {
  const money = (n: number) => formatMoney(n, moneyFormat);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Caja del mes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StatRow label="Días con caja cerrada" value={String(summary.closedDays)} />
        <StatRow label="Días con caja abierta" value={String(summary.openDays)} />
        <div className="grid grid-cols-3 gap-2 rounded-md border p-3 text-center text-sm">
          <div>
            <p className="text-xs text-muted-foreground uppercase">Sobrantes</p>
            <p className="tnum font-medium">{summary.sobrantes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Faltantes</p>
            <p className="tnum font-medium">{summary.faltantes}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase">Exactas</p>
            <p className="tnum font-medium">{summary.exactos}</p>
          </div>
        </div>
        <StatRow label="Arqueo neto del mes" value={money(summary.arqueoNet)} />
        <StatRow label="Retiros/ingresos manuales" value={`${money(summary.manualIn)} / ${money(summary.manualOut)}`} />
      </CardContent>
    </Card>
  );
}
