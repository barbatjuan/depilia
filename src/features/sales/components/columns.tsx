import type { ColumnDef } from "@tanstack/react-table";
import type { SaleListRow } from "@/features/sales/data/sales";
import { SaleStatusBadge } from "@/features/sales/components/sale-status-badge";
import { MoneyCell } from "@/components/money-cell";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
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
    cell: ({ row }) => {
      const { discount, balance } = row.original;
      if (discount.discountAmount > 0) {
        return (
          <span className="flex flex-col leading-tight">
            <span className="text-xs text-muted-foreground line-through">
              <MoneyCell amount={discount.listTotal} />
            </span>
            <MoneyCell amount={balance.total} />
          </span>
        );
      }
      return <MoneyCell amount={balance.total} />;
    },
  },
  {
    id: "paid",
    header: "Pagado",
    cell: ({ row }) => <MoneyCell amount={row.original.balance.paid} />,
  },
  {
    id: "balance",
    header: "Saldo",
    cell: ({ row }) => <MoneyCell amount={row.original.balance.balance} />,
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) => <SaleStatusBadge status={row.original.balance.status} />,
  },
];
