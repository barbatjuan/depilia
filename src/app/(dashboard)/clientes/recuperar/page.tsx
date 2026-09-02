import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getClientsToRecover } from "@/features/clients/data/recovery";
import {
  buildRecoveryList,
  type RecoveryBucket,
} from "@/features/clients/domain/recovery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BUCKET_VARIANT: Record<RecoveryBucket, "success" | "warning" | "destructive"> = {
  green: "success",
  yellow: "warning",
  red: "destructive",
};

const BUCKET_LABEL: Record<RecoveryBucket, string> = {
  green: "🟢 Al día",
  yellow: "🟡 Se está por perder",
  red: "🔴 Perdido",
};

const FILTERS: { value: RecoveryBucket; label: string }[] = [
  { value: "green", label: "🟢 Al día" },
  { value: "yellow", label: "🟡 Se está por perder" },
  { value: "red", label: "🔴 Perdido" },
];

export default async function ClientesARecuperarPage({
  searchParams,
}: {
  searchParams: Promise<{ color?: string }>;
}) {
  const { color } = await searchParams;
  const supabase = await createClient();
  const rows = await getClientsToRecover(supabase);
  const all = buildRecoveryList(rows, new Date());
  const clients =
    color === "green" || color === "yellow" || color === "red"
      ? all.filter((c) => c.bucket === color)
      : all;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/clientes">
            <ArrowLeft className="size-4" />
            Volver a clientes
          </Link>
        </Button>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Clientes a recuperar
            </h1>
            <p className="text-sm text-muted-foreground">
              {all.length} cliente{all.length === 1 ? "" : "s"} con al menos
              una visita, ordenados por más atrasado primero.
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={!color ? "default" : "outline"} size="sm" asChild>
          <Link href="/clientes/recuperar">Todos</Link>
        </Button>
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={color === f.value ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/clientes/recuperar?color=${f.value}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      {clients.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin clientes en esta categoría.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-md border">
          {clients.map((client) => (
            <div
              key={client.clientId}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/clientes/${client.clientId}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {client.name}
                </Link>
                <p className="text-xs text-muted-foreground">
                  Hace {client.daysSince} día{client.daysSince === 1 ? "" : "s"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={BUCKET_VARIANT[client.bucket]}>
                  {BUCKET_LABEL[client.bucket]}
                </Badge>
                {client.phone ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://wa.me/${client.phone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
