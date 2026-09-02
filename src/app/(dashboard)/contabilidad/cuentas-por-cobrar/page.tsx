import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { getReceivables } from "@/features/accounting/data/receivables";
import { buildReceivables } from "@/features/accounting/domain/receivables";
import { toCsv } from "@/lib/csv";
import { ExportCsvButton } from "@/features/accounting/components/export-csv-button";
import { ReceivablesTable } from "@/features/accounting/components/receivables-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function CuentasPorCobrarPage() {
  const supabase = await createClient();
  const [rows, moneyFormat] = await Promise.all([
    getReceivables(supabase),
    getMoneyFormat(supabase),
  ]);
  const receivables = buildReceivables(rows, new Date());
  const money = (n: number) => formatMoney(n, moneyFormat);

  const csv = toCsv(
    ["Cliente", "Ventas", "Deuda", "Más antigua"],
    receivables.clients.map((c) => [c.clientName, c.saleCount, c.owed, c.oldestUnpaidAt]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/contabilidad">
            <ArrowLeft className="size-4" />
            Volver a contabilidad
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Cuentas por cobrar</h1>
            <p className="text-sm text-muted-foreground">
              Total adeudado: <span className="tnum font-medium text-foreground">{money(receivables.grandTotal)}</span>
            </p>
          </div>
          <ExportCsvButton csv={csv} filename="cuentas-por-cobrar.csv" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">0-30 días</p>
            <p className="tnum text-lg font-semibold">{money(receivables.buckets["0-30"])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">31-60 días</p>
            <p className="tnum text-lg font-semibold">{money(receivables.buckets["31-60"])}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4 text-center">
            <p className="text-xs text-muted-foreground uppercase">61+ días</p>
            <p className="tnum text-lg font-semibold">{money(receivables.buckets["61+"])}</p>
          </CardContent>
        </Card>
      </div>

      <ReceivablesTable clients={receivables.clients} />
    </div>
  );
}
