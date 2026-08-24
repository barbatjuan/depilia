"use client";

// `expenseColumns` carries React Table `cell` render functions. Without
// "use client" this component is a Server Component by default, and
// passing `columns` as a prop into the "use client" `<DataTable>` below
// would try to serialize those functions across the RSC boundary and
// crash at request time ("Functions cannot be passed directly to Client
// Components") — caught by the E2E golden path, not by any unit test,
// since it only fails when the real `/gastos` route actually renders.
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
