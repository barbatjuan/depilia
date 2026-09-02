"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { receivablesColumns } from "@/features/accounting/components/receivables-columns";
import type { ReceivableClientRow } from "@/features/accounting/domain/receivables";

export function ReceivablesTable({ clients }: { clients: ReceivableClientRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={receivablesColumns}
      data={clients}
      emptyMessage="Sin cuentas por cobrar."
      onRowClick={(client) => router.push(`/clientes/${client.clientId}`)}
    />
  );
}
