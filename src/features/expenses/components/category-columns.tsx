import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ExpenseCategoryRow } from "@/features/expenses/data/categories";
import { DeleteCategoryButton } from "@/features/expenses/components/delete-category-button";

export const categoryColumns: ColumnDef<ExpenseCategoryRow>[] = [
  {
    id: "name",
    header: "Nombre",
    cell: ({ row }) => row.original.name,
  },
  {
    id: "archived",
    header: "Estado",
    cell: ({ row }) =>
      row.original.archived ? (
        <Badge variant="outline">Archivada</Badge>
      ) : (
        <Badge variant="secondary">Activa</Badge>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/configuracion/categorias/${row.original.id}/editar`}>
            Editar
          </Link>
        </Button>
        <DeleteCategoryButton id={row.original.id} />
      </div>
    ),
  },
];
