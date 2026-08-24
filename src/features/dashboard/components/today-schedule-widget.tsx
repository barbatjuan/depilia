import { CalendarCheck2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TodayAppointment } from "@/features/dashboard/data/get-today-schedule";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Programado",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "Ausente",
};

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "outline",
  no_show: "destructive",
};

export function TodayScheduleWidget({
  appointments,
}: {
  appointments: TodayAppointment[];
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarCheck2 className="size-4 text-brand" />
          <CardTitle>Turnos de hoy</CardTitle>
        </div>
        <CardDescription>
          {appointments.length === 0
            ? "Nada agendado para hoy."
            : `${appointments.length} turno${appointments.length === 1 ? "" : "s"} agendado${appointments.length === 1 ? "" : "s"}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No hay turnos programados para hoy.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {appointments.map((appt) => (
              <li
                key={appt.id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="w-14 shrink-0 text-sm font-medium tabular-nums">
                    {timeFormatter.format(new Date(appt.scheduledAt))}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{appt.clientName}</p>
                    <p className="text-xs text-muted-foreground">
                      {appt.zoneName}
                    </p>
                  </div>
                </div>
                <Badge variant={STATUS_VARIANT[appt.status] ?? "outline"}>
                  {STATUS_LABEL[appt.status] ?? appt.status}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
