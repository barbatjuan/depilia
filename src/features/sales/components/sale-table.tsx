"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { saleColumns } from "@/features/sales/components/columns";
import type { SaleListRow } from "@/features/sales/data/sales";

export function SaleTable({ sales }: { sales: SaleListRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={saleColumns}
      data={sales}
      emptyMessage="No hay ventas registradas."
      onRowClick={(sale) => router.push(`/ventas/${sale.id}`)}
    />
  );
}
