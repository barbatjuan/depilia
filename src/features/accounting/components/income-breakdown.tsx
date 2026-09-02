import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { SalesByTypeRow, VatBreakdownRow } from "@/features/accounting/domain/income-report";
import type { PaymentMixSlice } from "@/features/dashboard/domain/payment-mix";
import { PaymentMixChart } from "@/features/dashboard/components/charts/payment-mix-chart";

export function IncomeBreakdown({
  salesByType,
  vatBreakdown,
  paymentMix,
  moneyFormat,
}: {
  salesByType: SalesByTypeRow[];
  vatBreakdown: VatBreakdownRow[];
  paymentMix: PaymentMixSlice[];
  moneyFormat: MoneyFormat;
}) {
  const money = (n: number) => formatMoney(n, moneyFormat);
  const total = salesByType.find((r) => r.type === "total");
  const averageTicket = total && total.count > 0 ? total.gross / total.count : 0;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Ingresos por tipo de venta</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ventas</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesByType.map((row) => (
                <TableRow key={row.type} className={row.type === "total" ? "font-medium" : undefined}>
                  <TableCell>{row.label}</TableCell>
                  <TableCell className="tnum text-right">{row.count}</TableCell>
                  <TableCell className="tnum text-right">{money(row.gross)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-sm text-muted-foreground">
            Ticket medio: <span className="tnum font-medium text-foreground">{money(averageTicket)}</span>
          </p>
        </CardContent>
      </Card>

      <PaymentMixChart data={paymentMix} moneyFormat={moneyFormat} />

      <Card className="min-w-0 lg:col-span-2">
        <CardHeader>
          <CardTitle>IVA</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Alícuota</TableHead>
                <TableHead className="text-right">Base imponible</TableHead>
                <TableHead className="text-right">IVA repercutido</TableHead>
                <TableHead className="text-right">Total facturado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vatBreakdown.map((row) => (
                <TableRow
                  key={row.rateLabel}
                  className={row.rateLabel === "Total" ? "font-medium" : undefined}
                >
                  <TableCell>{row.rateLabel}</TableCell>
                  <TableCell className="tnum text-right">{money(row.net)}</TableCell>
                  <TableCell className="tnum text-right">{money(row.vat)}</TableCell>
                  <TableCell className="tnum text-right">{money(row.gross)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="mt-3 text-xs text-muted-foreground">
            Devengado — sobre ventas facturadas del mes, no sobre lo cobrado.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
