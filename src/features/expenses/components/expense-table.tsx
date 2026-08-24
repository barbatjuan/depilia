import { DataTable } from "@/components/data-table";
import { expenseColumns } from "@/features/expenses/components/columns";
import type { ExpenseRow } from "@/features/expenses/data/expenses";

export function ExpenseTable({ expenses }: { expenses: ExpenseRow[] }) {
  return (
    <DataTable
      columns={expenseColumns}
      data={expenses}
      emptyMessage="No hay gastos registrados."
    />
  );
}
