import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import type { ExpenseRow } from "@/features/expenses/data/expenses";
import { EXPENSE_METHOD_LABEL } from "@/features/expenses/schema";
import { Button } from "@/components/ui/button";
import { DeleteExpenseButton } from "@/features/expenses/components/delete-expense-button";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
});

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const expenseColumns: ColumnDef<ExpenseRow>[] = [
  {
    id: "spentOn",
    header: "Fecha",
    // spent_on is a plain date (YYYY-MM-DD); parse as UTC noon to avoid a
    // browser-local-tz off-by-one when formatting for display.
    cell: ({ row }) =>
      dateFormatter.format(new Date(`${row.original.spentOn}T12:00:00Z`)),
  },
  {
    id: "category",
    header: "Categoría",
    cell: ({ row }) => row.original.categoryName,
  },
  {
    id: "description",
    header: "Descripción",
    cell: ({ row }) => row.original.description ?? "—",
  },
  {
    id: "method",
    header: "Medio",
    cell: ({ row }) =>
      EXPENSE_METHOD_LABEL[row.original.method] ?? row.original.method,
  },
  {
    id: "amount",
    header: "Monto",
    cell: ({ row }) => currencyFormatter.format(row.original.amount),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/gastos/${row.original.id}/editar`}>Editar</Link>
        </Button>
        <DeleteExpenseButton id={row.original.id} />
      </div>
    ),
  },
];
