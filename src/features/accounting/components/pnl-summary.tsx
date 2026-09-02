import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { ProfitAndLoss } from "@/features/accounting/domain/profit-and-loss";
import { StatRow } from "./stat-row";

export function PnlSummary({
  pnl,
  moneyFormat,
}: {
  pnl: ProfitAndLoss;
  moneyFormat: MoneyFormat;
}) {
  const money = (n: number) => formatMoney(n, moneyFormat);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Resultado del mes</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StatRow label="Ingresos cobrados" value={money(pnl.month.income)} deltaPct={pnl.monthDelta.incomePct} />
        <StatRow label="Gastos" value={money(pnl.month.expense)} />
        <StatRow
          label="Resultado"
          value={money(pnl.month.result)}
          deltaPct={pnl.monthDelta.resultPct}
          hero
        />
        <div className="mt-2 border-t border-border/60 pt-3">
          <StatRow label="Acumulado del año" value={money(pnl.ytd.result)} />
        </div>
      </CardContent>
    </Card>
  );
}
