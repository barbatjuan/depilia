"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "@/components/data-table";
import { clientColumns } from "@/features/clients/components/columns";
import type { ClientRow } from "@/features/clients/data/clients";

export function ClientTable({ clients }: { clients: ClientRow[] }) {
  const router = useRouter();

  return (
    <DataTable
      columns={clientColumns}
      data={clients}
      emptyMessage="No hay clientes que coincidan con la búsqueda."
      onRowClick={(client) => router.push(`/clientes/${client.id}`)}
    />
  );
}
