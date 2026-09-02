import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { SectionLabel } from "@/components/section-label";
import { parseMonthParam, formatMonthLabel } from "@/features/accounting/domain/period";
import { buildProfitAndLoss } from "@/features/accounting/domain/profit-and-loss";
import { buildSalesByType, buildVatBreakdown } from "@/features/accounting/domain/income-report";
import { buildExpenseBreakdown } from "@/features/accounting/domain/expense-report";
import { buildBusinessMetrics } from "@/features/accounting/domain/business-metrics";
import { buildPaymentMix } from "@/features/dashboard/domain/payment-mix";
import { currencyFractionDigits } from "@/features/promotions/domain/discount";
import { toCsv } from "@/features/accounting/domain/csv";
import { getAccountingYear } from "@/features/accounting/data/accounting-year";
import { getIncomeReport } from "@/features/accounting/data/income-report";
import { getExpenseReport } from "@/features/accounting/data/expense-report";
import { getCashMonthReport } from "@/features/accounting/data/cash-month";
import { getMonthlyAppointments } from "@/features/accounting/data/monthly-appointments";
import { getClientsFirstSale } from "@/features/accounting/data/business-metrics";
import { getReceivablesTotal } from "@/features/accounting/data/receivables";
import { MonthPicker } from "@/features/accounting/components/month-picker";
import { ExportCsvButton } from "@/features/accounting/components/export-csv-button";
import { PnlSummary } from "@/features/accounting/components/pnl-summary";
import { IncomeBreakdown } from "@/features/accounting/components/income-breakdown";
import { ExpenseBreakdown } from "@/features/accounting/components/expense-breakdown";
import { CashMonthCard } from "@/features/accounting/components/cash-month-card";
import { BusinessMetricsCard } from "@/features/accounting/components/business-metrics-card";
import { Card, CardContent } from "@/components/ui/card";

export default async function ContabilidadPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes } = await searchParams;
  const now = new Date();
  const monthKey = parseMonthParam(mes, now);

  const supabase = await createClient();
  const [
    moneyFormat,
    accountingYear,
    incomeReport,
    expenses,
    cashMonth,
    appointments,
    clientsFirstSale,
    receivablesTotal,
  ] = await Promise.all([
    getMoneyFormat(supabase),
    getAccountingYear(supabase, monthKey),
    getIncomeReport(supabase, monthKey),
    getExpenseReport(supabase, monthKey),
    getCashMonthReport(supabase, monthKey),
    getMonthlyAppointments(supabase, monthKey),
    getClientsFirstSale(supabase),
    getReceivablesTotal(supabase),
  ]);

  const fractionDigits = currencyFractionDigits(moneyFormat.currency);
  const pnl = buildProfitAndLoss({ monthKey, ...accountingYear });
  const salesByType = buildSalesByType(incomeReport.sales, fractionDigits);
  const vatBreakdown = buildVatBreakdown(incomeReport.sales, fractionDigits);
  const paymentMix = buildPaymentMix(incomeReport.payments);
  const expenseBreakdown = buildExpenseBreakdown(expenses, pnl.month.income);
  const businessMetrics = buildBusinessMetrics({
    monthKey,
    appointments: appointments.map((a) => ({ status: a.status, zoneName: a.zoneName })),
    sales: incomeReport.sales.map((s) => ({
      clientId: s.clientId,
      total: s.total,
      soldAt: s.soldAt,
    })),
    clientsFirstSale,
  });

  const csv = toCsv(
    ["Sección", "Concepto", "Valor"],
    [
      ["P&L", "Ingresos cobrados", pnl.month.income],
      ["P&L", "Gastos", pnl.month.expense],
      ["P&L", "Resultado", pnl.month.result],
      ...salesByType.map((row) => ["Ingresos por tipo", row.label, row.gross]),
      ...vatBreakdown.map((row) => ["IVA", row.rateLabel, row.vat]),
      ...expenseBreakdown.map((row) => ["Gastos", row.categoryName, row.total]),
      ["Caja", "Arqueo neto", cashMonth.arqueoNet],
      ["Caja", "Retiros/ingresos manuales", cashMonth.manualIn - cashMonth.manualOut],
    ],
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {formatMonthLabel(monthKey, moneyFormat.locale)}
          </h1>
          <Link
            href="/contabilidad/cuentas-por-cobrar"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Deuda de clientes: {formatMoney(receivablesTotal, moneyFormat)}
          </Link>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <MonthPicker monthKey={monthKey} />
          <ExportCsvButton csv={csv} filename={`contabilidad-${monthKey}.csv`} />
        </div>
      </div>

      <section>
        <SectionLabel>Resumen</SectionLabel>
        <PnlSummary pnl={pnl} moneyFormat={moneyFormat} />
      </section>

      <section>
        <SectionLabel>Ingresos e IVA</SectionLabel>
        <IncomeBreakdown
          salesByType={salesByType}
          vatBreakdown={vatBreakdown}
          paymentMix={paymentMix}
          moneyFormat={moneyFormat}
        />
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <SectionLabel>Gastos</SectionLabel>
          <ExpenseBreakdown rows={expenseBreakdown} moneyFormat={moneyFormat} />
        </div>
        <div>
          <SectionLabel>Caja del mes</SectionLabel>
          <CashMonthCard summary={cashMonth} moneyFormat={moneyFormat} />
        </div>
      </section>

      <section>
        <SectionLabel>Métricas de negocio</SectionLabel>
        <BusinessMetricsCard metrics={businessMetrics} moneyFormat={moneyFormat} />
      </section>

      {appointments.length === 0 && incomeReport.sales.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Sin actividad registrada este mes.
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
