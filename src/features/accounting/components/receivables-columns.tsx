import type { ColumnDef } from "@tanstack/react-table";
import type { ReceivableClientRow } from "@/features/accounting/domain/receivables";
import { MoneyCell } from "@/components/money-cell";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
});

export const receivablesColumns: ColumnDef<ReceivableClientRow>[] = [
  {
    id: "client",
    header: "Cliente",
    cell: ({ row }) => <span className="font-medium">{row.original.clientName}</span>,
  },
  {
    id: "saleCount",
    header: "Ventas",
    cell: ({ row }) => row.original.saleCount,
  },
  {
    id: "owed",
    header: "Deuda",
    cell: ({ row }) => <MoneyCell amount={row.original.owed} />,
  },
  {
    id: "oldestUnpaidAt",
    header: "Más antigua",
    cell: ({ row }) => dateFormatter.format(new Date(row.original.oldestUnpaidAt)),
  },
];
