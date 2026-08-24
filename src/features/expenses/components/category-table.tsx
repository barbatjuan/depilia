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
