import type { ColumnDef } from "@tanstack/react-table";
import type { SaleListRow } from "@/features/sales/data/sales";
import { SaleStatusBadge } from "@/features/sales/components/sale-status-badge";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
});

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export const saleColumns: ColumnDef<SaleListRow>[] = [
  {
    id: "client",
    header: "Cliente",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.clientName}</span>
    ),
  },
  {
    id: "description",
    header: "Ítem",
    cell: ({ row }) => row.original.description,
  },
  {
    id: "soldAt",
    header: "Fecha",
    cell: ({ row }) => dateFormatter.format(new Date(row.original.soldAt)),
  },
  {
    id: "total",
    header: "Total",
    cell: ({ row }) => currencyFormatter.format(row.original.balance.total),
  },
  {
    id: "paid",
    header: "Pagado",
    cell: ({ row }) => currencyFormatter.format(row.original.balance.paid),
  },
  {
    id: "balance",
    header: "Saldo",
    cell: ({ row }) => currencyFormatter.format(row.original.balance.balance),
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => <SaleStatusBadge status={row.original.balance.status} />,
  },
];
