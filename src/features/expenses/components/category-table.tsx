"use client";

// See `expense-table.tsx` — same reasoning: `categoryColumns` carries
// `cell` render functions, so this wrapper needs "use client" or passing
// `columns` into `<DataTable>` crashes at request time.
import { DataTable } from "@/components/data-table";
import { categoryColumns } from "@/features/expenses/components/category-columns";
import type { ExpenseCategoryRow } from "@/features/expenses/data/categories";

export function CategoryTable({
  categories,
}: {
  categories: ExpenseCategoryRow[];
}) {
  return (
    <DataTable
      columns={categoryColumns}
      data={categories}
      emptyMessage="No hay categorías creadas."
    />
  );
}
