import { CalendarX2 } from "lucide-react";
import {
  groupAppointmentsByHour,
  groupAppointmentsByWeekday,
} from "@/features/appointments/domain/agenda-grid";
import type { AppointmentListRow } from "@/features/appointments/data/appointments";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";
import { AppointmentCard } from "@/features/appointments/components/appointment-card";

const START_HOUR = 8;
const END_HOUR = 20;

const weekdayFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "short",
  day: "2-digit",
  month: "2-digit",
});

/**
 * Day/week hour-grid agenda view (design "UI System" — `<AgendaCalendar>`,
 * tz-pinned to Buenos Aires). `rangeStart` is the BA day/week bounds start
 * (from `getClinicDayBounds`/`getClinicWeekBounds`) the caller already
 * computed for fetching `appointments`.
 */
export function AgendaCalendar({
  view,
  rangeStart,
  appointments,
  zones,
}: {
  view: "day" | "week";
  rangeStart: Date;
  appointments: AppointmentListRow[];
  zones: BodyZoneOption[];
}) {
  if (appointments.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed py-16 text-center">
        <CalendarX2 className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          {view === "day"
            ? "No hay turnos para este día."
            : "No hay turnos para esta semana."}
        </p>
        <p className="text-xs text-muted-foreground">
          Usá &quot;Nuevo turno&quot; para agendar el primero.
        </p>
      </div>
    );
  }

  if (view === "day") {
    const grouped = groupAppointmentsByHour(
      appointments,
      rangeStart,
      START_HOUR,
      END_HOUR,
    );
    const hours = Array.from(
      { length: END_HOUR - START_HOUR },
      (_, i) => START_HOUR + i,
    );

    return (
      <div className="flex flex-col divide-y rounded-md border">
        {hours.map((hour) => {
          const items = grouped.get(hour) ?? [];
          return (
            <div key={hour} className="flex gap-4 p-3">
              <span className="w-14 shrink-0 pt-1 text-sm font-medium text-muted-foreground tabular-nums">
                {String(hour).padStart(2, "0")}:00
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                {items.length === 0 ? (
                  <span className="text-xs text-muted-foreground/60">—</span>
                ) : (
                  items.map((appt) => (
                    <AppointmentCard
                      key={appt.id}
                      appointment={appt}
                      zones={zones}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  const columns = groupAppointmentsByWeekday(appointments, rangeStart);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {columns.map((dayAppointments, index) => {
        const columnDate = new Date(
          rangeStart.getTime() + index * 24 * 60 * 60 * 1000,
        );
        const isToday =
          new Intl.DateTimeFormat("en-CA", {
            timeZone: "America/Argentina/Buenos_Aires",
          }).format(columnDate) === todayKey;
        return (
          <div
            key={index}
            className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/40 p-2"
          >
            <p
              className={
                isToday
                  ? "text-center text-xs font-semibold text-primary capitalize"
                  : "text-center text-xs font-medium text-muted-foreground capitalize"
              }
            >
              {weekdayFormatter.format(columnDate)}
            </p>
            <div className="flex flex-col gap-1">
              {dayAppointments.length === 0 ? (
                <span className="py-1 text-center text-[0.7rem] text-muted-foreground/50">
                  —
                </span>
              ) : (
                dayAppointments.map((appt) => (
                  <AppointmentCard
                    key={appt.id}
                    appointment={appt}
                    zones={zones}
                    variant="compact"
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
