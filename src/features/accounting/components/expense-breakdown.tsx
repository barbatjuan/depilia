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
import type { ExpenseBreakdownRow } from "@/features/accounting/domain/expense-report";

export function ExpenseBreakdown({
  rows,
  moneyFormat,
}: {
  rows: ExpenseBreakdownRow[];
  moneyFormat: MoneyFormat;
}) {
  const money = (n: number) => formatMoney(n, moneyFormat);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Gastos por categoría</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 1 ? (
          <p className="text-sm text-muted-foreground">Sin gastos registrados este mes.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Categoría</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">% gastos</TableHead>
                <TableHead className="text-right">% ingresos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.categoryName}
                  className={row.categoryName === "Total" ? "font-medium" : undefined}
                >
                  <TableCell>{row.categoryName}</TableCell>
                  <TableCell className="tnum text-right">{money(row.total)}</TableCell>
                  <TableCell className="tnum text-right">{row.pctOfExpenses}%</TableCell>
                  <TableCell className="tnum text-right">
                    {row.pctOfIncome === null ? "—" : `${row.pctOfIncome}%`}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
