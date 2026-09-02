import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { BusinessMetrics } from "@/features/accounting/domain/business-metrics";
import { StatRow } from "./stat-row";

export function BusinessMetricsCard({
  metrics,
  moneyFormat,
}: {
  metrics: BusinessMetrics;
  moneyFormat: MoneyFormat;
}) {
  const busiestWeekday = metrics.revenueByWeekday.reduce(
    (best, row) => (row.total > best.total ? row : best),
    metrics.revenueByWeekday[0]!,
  );
  const busiestHour = metrics.revenueByHour.reduce(
    (best, row) => (row.total > best.total ? row : best),
    metrics.revenueByHour[0]!,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Métricas de negocio</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <StatRow label="Tasa de cancelación" value={`${metrics.cancelRate}%`} />
        <StatRow label="Tasa de ausentismo" value={`${metrics.noShowRate}%`} />
        <StatRow label="Clientes nuevos" value={String(metrics.newClients)} />
        <StatRow label="Clientes recurrentes" value={String(metrics.returningClients)} />
        {busiestWeekday.total > 0 ? (
          <StatRow
            label="Día más rentable"
            value={`${busiestWeekday.weekday} (${formatMoney(busiestWeekday.total, moneyFormat)})`}
          />
        ) : null}
        {busiestHour.total > 0 ? (
          <StatRow
            label="Franja más rentable"
            value={`${busiestHour.hour}:00 (${formatMoney(busiestHour.total, moneyFormat)})`}
          />
        ) : null}
        {metrics.topZones.length > 0 ? (
          <div>
            <p className="mb-2 text-sm text-muted-foreground">Zonas top</p>
            <div className="flex flex-wrap gap-2">
              {metrics.topZones.map((zone) => (
                <span
                  key={zone.zoneName}
                  className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium"
                >
                  {zone.zoneName} · {zone.count}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
