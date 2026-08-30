import Link from "next/link";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/kpi-card";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { listExpenses } from "@/features/expenses/data/expenses";
import { ExpenseTable } from "@/features/expenses/components/expense-table";
import { currentMonthRange, sumExpenses } from "@/features/expenses/domain/month-total";
import { CLOSED_CAJA_WARNING } from "@/features/cash/domain/closed-caja-warning";

export default async function GastosPage({
  searchParams,
}: {
  searchParams: Promise<{ aviso?: string }>;
}) {
  const { aviso } = await searchParams;
  const supabase = await createClient();
  const moneyFormat = await getMoneyFormat(supabase);
  const [expenses, month] = await Promise.all([
    listExpenses(supabase),
    Promise.resolve(currentMonthRange(new Date())),
  ]);
  const monthExpenses = expenses.filter(
    (e) => e.spentOn >= month.start && e.spentOn < month.end,
  );
  const monthTotal = sumExpenses(monthExpenses);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Gastos</h1>
          <p className="text-sm text-muted-foreground">
            {expenses.length} gasto{expenses.length === 1 ? "" : "s"}{" "}
            registrado{expenses.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/gastos/nuevo">Nuevo gasto</Link>
        </Button>
      </div>
      {aviso === "caja-cerrada" ? (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {CLOSED_CAJA_WARNING}
        </p>
      ) : null}
      <div className="grid grid-cols-1 gap-4 sm:max-w-xs">
        <KpiCard
          label="Total del mes"
          value={formatMoney(monthTotal, moneyFormat)}
          icon={Wallet}
        />
      </div>
      <ExpenseTable expenses={expenses} />
    </div>
  );
}
