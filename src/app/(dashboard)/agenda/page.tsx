import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listAppointmentsInRange } from "@/features/appointments/data/appointments";
import {
  formatAgendaDateParam,
  parseAgendaDate,
  shiftAgendaDate,
  type AgendaView,
} from "@/features/appointments/domain/agenda-nav";
import {
  getClinicDayBounds,
  getClinicWeekBounds,
} from "@/features/dashboard/domain/schedule";
import { AgendaCalendar } from "@/components/agenda-calendar";
import { BookAppointmentSheet } from "@/features/appointments/components/book-appointment-sheet";
import { listClients } from "@/features/clients/data/clients";
import { listActiveBodyZones } from "@/features/packages/data/package-templates";
import { Button } from "@/components/ui/button";

const dayLabelFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const weekEdgeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "short",
});

function agendaHref(view: AgendaView, date: Date) {
  return `/agenda?view=${view}&date=${formatAgendaDateParam(date)}`;
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view: AgendaView = params.view === "week" ? "week" : "day";
  const referenceDate = parseAgendaDate(params.date);
  const bounds =
    view === "day"
      ? getClinicDayBounds(referenceDate)
      : getClinicWeekBounds(referenceDate);

  const supabase = await createClient();
  const [appointments, clients, zones] = await Promise.all([
    listAppointmentsInRange(supabase, bounds),
    listClients(supabase),
    listActiveBodyZones(supabase),
  ]);

  const prevHref = agendaHref(view, shiftAgendaDate(referenceDate, view, -1));
  const nextHref = agendaHref(view, shiftAgendaDate(referenceDate, view, 1));
  const todayHref = agendaHref(view, new Date());

  const rangeLabel =
    view === "day"
      ? dayLabelFormatter.format(referenceDate)
      : `${weekEdgeFormatter.format(bounds.start)} – ${weekEdgeFormatter.format(
          new Date(bounds.end.getTime() - 24 * 60 * 60 * 1000),
        )}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight capitalize">
            {rangeLabel}
          </h1>
          <div className="mt-1 flex gap-1">
            <Link href={agendaHref("day", referenceDate)}>
              <Button variant={view === "day" ? "default" : "outline"} size="sm">
                Día
              </Button>
            </Link>
            <Link href={agendaHref("week", referenceDate)}>
              <Button
                variant={view === "week" ? "default" : "outline"}
                size="sm"
              >
                Semana
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={prevHref}>
            <Button variant="outline" size="icon" aria-label="Anterior">
              <ChevronLeft className="size-4" />
            </Button>
          </Link>
          <Link href={todayHref}>
            <Button variant="outline" size="sm">
              Hoy
            </Button>
          </Link>
          <Link href={nextHref}>
            <Button variant="outline" size="icon" aria-label="Siguiente">
              <ChevronRight className="size-4" />
            </Button>
          </Link>
          <BookAppointmentSheet clients={clients} zones={zones} />
        </div>
      </div>

      <AgendaCalendar
        view={view}
        rangeStart={bounds.start}
        appointments={appointments}
      />
    </div>
  );
}
