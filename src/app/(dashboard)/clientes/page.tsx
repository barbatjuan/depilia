import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listClients } from "@/features/clients/data/clients";
import { ClientTable } from "@/features/clients/components/client-table";
import { ClientSearch } from "@/features/clients/components/client-search";
import { Button } from "@/components/ui/button";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const clients = await listClients(supabase, q);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button asChild>
          <Link href="/clientes/nuevo">
            <Plus className="size-4" />
            Nuevo cliente
          </Link>
        </Button>
      </div>
      <ClientSearch defaultValue={q ?? ""} />
      <ClientTable clients={clients} />
    </div>
  );
}
