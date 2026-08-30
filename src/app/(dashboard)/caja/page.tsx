import Link from "next/link";
import { formatInTimeZone } from "date-fns-tz";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";
import {
  getSessionForDate,
  listSessions,
} from "@/features/cash/data/cash-session";
import { listMovements } from "@/features/cash/data/cash-movements";
import {
  getTheoretical,
  listTodayCashPayments,
} from "@/features/cash/data/cash-balance";
import { openSessionAction } from "@/features/cash/actions/open-session";
import { closeSessionAction } from "@/features/cash/actions/close-session";
import { registerMovementAction } from "@/features/cash/actions/register-movement";
import { OpenSessionForm } from "@/features/cash/components/open-session-form";
import { CloseSessionForm } from "@/features/cash/components/close-session-form";
import { MovementForm } from "@/features/cash/components/movement-form";
import { MovementTable } from "@/features/cash/components/movement-table";
import { TodayCashPayments } from "@/features/cash/components/today-cash-payments";
import { SessionSummaryCard } from "@/features/cash/components/session-summary-card";

/**
 * `/caja` — the daily cash register (spec: "cash-register"). Routing only:
 * it reads today's BA session and renders one of three states (none → open
 * form, open → live summary + movements + close arqueo, closed → arqueo
 * result). All money math is the DB view / trigger's job; this page injects
 * the request-scoped Supabase client into the `data/` layer.
 */
export default async function CajaPage() {
  const supabase = await createClient();
  const now = new Date();
  const businessDate = formatInTimeZone(now, CLINIC_TZ, "yyyy-MM-dd");
  const session = await getSessionForDate(supabase, businessDate);

  const ventasLink = (
    <Button variant="outline" asChild>
      <Link href="/ventas">
        Ver historial de ventas
        <ArrowRight className="size-4" />
      </Link>
    </Button>
  );

  const header = (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
        <p className="text-sm text-muted-foreground">
          Apertura, movimientos y arqueo del día
        </p>
      </div>
      {ventasLink}
    </div>
  );

  if (!session) {
    const recent = await listSessions(supabase, 5);
    const lastClosed = recent.find((row) => row.status === "closed");
    return (
      <div className="flex flex-col gap-6">
        {header}
        <Card>
          <CardHeader>
            <CardTitle>Abrir caja</CardTitle>
            <CardDescription>
              Todavía no abriste la caja de hoy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OpenSessionForm
              action={openSessionAction}
              businessDate={businessDate}
              previousCounted={lastClosed?.countedAmount ?? null}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const [theoretical, movements, cashPayments] = await Promise.all([
    getTheoretical(supabase, session.id),
    listMovements(supabase, session.id),
    listTodayCashPayments(supabase, now),
  ]);

  if (session.status === "closed") {
    return (
      <div className="flex flex-col gap-6">
        {header}
        <SessionSummaryCard session={session} theoretical={null} />
        <Card>
          <CardHeader>
            <CardTitle>Movimientos</CardTitle>
          </CardHeader>
          <CardContent>
            <MovementTable movements={movements} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Cobros en efectivo de hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <TodayCashPayments payments={cashPayments} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const boundClose = closeSessionAction.bind(null, session.id);
  const boundMovement = registerMovementAction.bind(null, session.id);

  return (
    <div className="flex flex-col gap-6">
      {header}
      <SessionSummaryCard session={session} theoretical={theoretical} />

      <Card>
        <CardHeader>
          <CardTitle>Registrar movimiento</CardTitle>
          <CardDescription>
            Retiros, ingresos y ajustes manuales del cajón.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MovementForm action={boundMovement} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
        </CardHeader>
        <CardContent>
          <MovementTable movements={movements} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cobros en efectivo de hoy</CardTitle>
          <CardDescription>
            Alimentan el teórico. Cada cobro enlaza a su venta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TodayCashPayments payments={cashPayments} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cerrar caja</CardTitle>
          <CardDescription>
            Contá el cajón y registrá el arqueo del día.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CloseSessionForm
            action={boundClose}
            theoretical={theoretical?.theoretical ?? session.openingAmount}
          />
        </CardContent>
      </Card>
    </div>
  );
}
