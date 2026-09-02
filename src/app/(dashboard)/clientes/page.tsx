import Link from "next/link";
import { CalendarClock, HeartHandshake, Plus } from "lucide-react";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {clients.length} cliente{clients.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/clientes/recuperar">
              <HeartHandshake className="size-4" />
              Clientes a recuperar
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/clientes/recontacto">
              <CalendarClock className="size-4" />
              Recontacto por zona
            </Link>
          </Button>
          <Button asChild>
            <Link href="/clientes/nuevo">
              <Plus className="size-4" />
              Nuevo cliente
            </Link>
          </Button>
        </div>
      </div>
      <ClientSearch defaultValue={q ?? ""} />
      <ClientTable clients={clients} />
    </div>
  );
}
