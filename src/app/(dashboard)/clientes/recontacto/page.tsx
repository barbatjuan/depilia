import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import { getZonesToRecontact } from "@/features/clients/data/zone-recurrence";
import {
  buildRecurrenceList,
  type RecurrenceStatus,
} from "@/features/clients/domain/zone-recurrence";
import { ExportCsvButton } from "@/features/accounting/components/export-csv-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_VARIANT: Record<RecurrenceStatus, "warning" | "destructive"> = {
  due: "warning",
  overdue: "destructive",
};

const STATUS_LABEL: Record<RecurrenceStatus, string> = {
  due: "🟡 Toca",
  overdue: "🔴 Muy atrasado",
};

const FILTERS: { value: RecurrenceStatus; label: string }[] = [
  { value: "due", label: "🟡 Toca" },
  { value: "overdue", label: "🔴 Muy atrasado" },
];

const weeks = (n: number) => `${n} semana${n === 1 ? "" : "s"}`;

export default async function RecontactoPorZonaPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string }>;
}) {
  const { estado } = await searchParams;
  const supabase = await createClient();
  const now = new Date();
  const rows = await getZonesToRecontact(supabase, now);
  const all = buildRecurrenceList(rows, now);
  const list =
    estado === "due" || estado === "overdue"
      ? all.filter((r) => r.status === estado)
      : all;

  const csv = toCsv(
    ["Cliente", "Zona", "Sesiones sin usar", "Última sesión", "Semanas atrasado"],
    all.map((r) => [
      r.clientName,
      r.zoneName,
      r.remainingSessions,
      r.lastSessionAt ?? "sin usar",
      r.weeksOverdue,
    ]),
  );

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
              Recontacto por zona
            </h1>
            <p className="text-sm text-muted-foreground">
              {all.length === 1
                ? "1 bono activo atrasado respecto al ciclo de su zona."
                : `${all.length} bonos activos atrasados respecto al ciclo de su zona.`}{" "}
              Más atrasado primero.
            </p>
          </div>
          <ExportCsvButton csv={csv} filename="recontacto-por-zona.csv" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant={!estado ? "default" : "outline"} size="sm" asChild>
          <Link href="/clientes/recontacto">Todos</Link>
        </Button>
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={estado === f.value ? "default" : "outline"}
            size="sm"
            asChild
          >
            <Link href={`/clientes/recontacto?estado=${f.value}`}>{f.label}</Link>
          </Button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin bonos en esta categoría.
        </p>
      ) : (
        <div className="flex flex-col divide-y rounded-md border">
          {list.map((r) => (
            <div
              key={`${r.clientId}-${r.zoneId}`}
              className="flex flex-wrap items-center justify-between gap-3 p-3"
            >
              <div className="min-w-0">
                <Link
                  href={`/clientes/${r.clientId}`}
                  className="truncate text-sm font-medium hover:underline"
                >
                  {r.clientName}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {r.zoneName} · {r.remainingSessions} sin usar ·{" "}
                  {r.lastSessionAt
                    ? `última hace ${weeks(r.weeksSince)}`
                    : `comprado hace ${weeks(r.weeksSince)}, sin estrenar`}{" "}
                  · atrasado {weeks(r.weeksOverdue)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_VARIANT[r.status]}>
                  {STATUS_LABEL[r.status]}
                </Badge>
                {r.phone ? (
                  <Button variant="outline" size="sm" asChild>
                    <a
                      href={`https://wa.me/${r.phone.replace(/\D/g, "")}`}
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
