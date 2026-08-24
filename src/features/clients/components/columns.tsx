import type { ColumnDef } from "@tanstack/react-table";
import type { ClientRow } from "@/features/clients/data/clients";

export const clientColumns: ColumnDef<ClientRow>[] = [
  {
    id: "name",
    header: "Nombre",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.lastName}, {row.original.firstName}
      </span>
    ),
  },
  {
    id: "phone",
    header: "Teléfono",
    cell: ({ row }) => row.original.phone || "—",
  },
  {
    id: "email",
    header: "Email",
    cell: ({ row }) => row.original.email || "—",
  },
];
