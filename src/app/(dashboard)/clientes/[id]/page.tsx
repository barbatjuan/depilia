import Link from "next/link";
import { notFound } from "next/navigation";
import { Mail, Pencil, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { getClient } from "@/features/clients/data/clients";
import {
  getClientAppointments,
  getClientPackages,
} from "@/features/clients/data/client-ficha";
import { summarizeClientPackages } from "@/features/clients/domain/client-packages";
import {
  listActiveBodyZones,
  listActivePackageTemplates,
} from "@/features/packages/data/package-templates";
import { PackageSaleActions } from "@/features/packages/components/package-sale-actions";
import { listActiveBonusPromotions } from "@/features/promotions/data/promotions";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";
import { formatInTimeZone } from "date-fns-tz";
import { listSales } from "@/features/sales/data/sales";
import { SaleStatusBadge } from "@/features/sales/components/sale-status-badge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
  timeStyle: "short",
});

const APPOINTMENT_STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "Ausente",
};

const APPOINTMENT_STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "outline",
  no_show: "destructive",
};

export default async function ClienteFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const client = await getClient(supabase, id);
  if (!client) notFound();

  const businessDate = formatInTimeZone(new Date(), CLINIC_TZ, "yyyy-MM-dd");
  const [
    packages,
    appointments,
    packageTemplates,
    zones,
    promotions,
    sales,
    moneyFormat,
  ] = await Promise.all([
    getClientPackages(supabase, id),
    getClientAppointments(supabase, id),
    listActivePackageTemplates(supabase),
    listActiveBodyZones(supabase),
    listActiveBonusPromotions(supabase, businessDate),
    listSales(supabase, { clientId: id }),
    getMoneyFormat(supabase),
  ]);
  const packageSummaries = summarizeClientPackages(packages);
  const activePackages = packageSummaries.filter((p) => p.status === "active");
  const pastPackages = packageSummaries.filter((p) => p.status === "completed");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {client.firstName} {client.lastName}
          </h1>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            {client.phone ? (
              <span className="flex items-center gap-1.5">
                <Phone className="size-3.5" /> {client.phone}
              </span>
            ) : null}
            {client.email ? (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" /> {client.email}
              </span>
            ) : null}
            {!client.phone && !client.email ? "Sin datos de contacto" : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PackageSaleActions
            clientId={id}
            templates={packageTemplates}
            zones={zones}
            promotions={promotions}
          />
          <Button variant="outline" asChild>
            <Link href={`/clientes/${id}/editar`}>
              <Pencil className="size-4" />
              Editar
            </Link>
          </Button>
        </div>
      </div>

      {client.notes ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Notas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{client.notes}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Paquetes activos</CardTitle>
          <CardDescription>
            Sesiones restantes por zona (total − usadas)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activePackages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin paquetes activos.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {activePackages.map((pkg) => (
                <li
                  key={pkg.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <span className="font-medium">{pkg.zoneName}</span>
                  <span className="text-sm text-muted-foreground">
                    {pkg.remaining} de {pkg.totalSessions} sesiones restantes
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {pastPackages.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Paquetes finalizados</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-3">
              {pastPackages.map((pkg) => (
                <li
                  key={pkg.id}
                  className="flex items-center justify-between rounded-md border p-3 text-muted-foreground"
                >
                  <span className="font-medium">{pkg.zoneName}</span>
                  <span className="text-sm">
                    {pkg.sessionsUsed} de {pkg.totalSessions} sesiones usadas
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Ventas</CardTitle>
            <CardDescription>
              Historial de ventas y pagos de este cliente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/ventas?clientId=${id}`}>Ver todas</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {sales.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin ventas registradas todavía.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sales.map((sale) => (
                <li key={sale.id}>
                  <Link
                    href={`/ventas/${sale.id}`}
                    className="flex items-center justify-between rounded-md border p-3 hover:bg-accent"
                  >
                    <div>
                      <p className="font-medium">{sale.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {dateFormatter.format(new Date(sale.soldAt))} —{" "}
                        {formatMoney(sale.balance.total, moneyFormat)}
                      </p>
                    </div>
                    <SaleStatusBadge status={sale.balance.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de turnos</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin turnos registrados todavía.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {appointments.map((appt) => (
                <li
                  key={appt.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">{appt.zoneName}</p>
                    <p className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(appt.scheduledAt))}
                    </p>
                  </div>
                  <Badge variant={APPOINTMENT_STATUS_VARIANT[appt.status] ?? "outline"}>
                    {APPOINTMENT_STATUS_LABEL[appt.status] ?? appt.status}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
