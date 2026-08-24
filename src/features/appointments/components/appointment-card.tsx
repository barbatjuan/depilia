"use client";

import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RescheduleForm } from "@/features/appointments/components/reschedule-form";
import { rescheduleAppointmentAction } from "@/features/appointments/actions/reschedule-appointment";
import { setAppointmentStatusAction } from "@/features/appointments/actions/set-appointment-status";
import {
  STATUS_LABEL,
  type AppointmentStatus,
} from "@/features/appointments/domain/status";
import type { AppointmentListRow } from "@/features/appointments/data/appointments";

const STATUS_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  scheduled: "default",
  completed: "secondary",
  cancelled: "outline",
  no_show: "destructive",
};

const NEXT_STATUS_ACTIONS: Record<
  AppointmentStatus,
  { status: AppointmentStatus; label: string }[]
> = {
  scheduled: [
    { status: "completed", label: "Completar" },
    { status: "no_show", label: "No se presentó" },
    { status: "cancelled", label: "Cancelar" },
  ],
  completed: [{ status: "cancelled", label: "Cancelar" }],
  cancelled: [],
  no_show: [],
};

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
});

/**
 * A single agenda appointment: time, client, zone, status badge, the
 * transition buttons allowed from its current status (task: "call the right
 * status transition" — never a raw `UPDATE`), and a reschedule trigger.
 */
export function AppointmentCard({
  appointment,
}: {
  appointment: AppointmentListRow;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const status = appointment.status as AppointmentStatus;
  const actions = NEXT_STATUS_ACTIONS[status] ?? [];
  const canReschedule = status === "scheduled";

  function handleTransition(next: AppointmentStatus) {
    setError(null);
    startTransition(async () => {
      const result = await setAppointmentStatusAction(
        appointment.id,
        status,
        next,
      );
      if (result.error) setError(result.error);
    });
  }

  const boundReschedule = rescheduleAppointmentAction.bind(
    null,
    appointment.id,
  );

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="w-14 shrink-0 text-sm font-medium tabular-nums">
            {timeFormatter.format(new Date(appointment.scheduledAt))}
          </span>
          <div>
            <p className="text-sm font-medium">{appointment.clientName}</p>
            <p className="text-xs text-muted-foreground">
              {appointment.zoneName}
            </p>
          </div>
        </div>
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {actions.length > 0 || canReschedule ? (
        <div className="flex flex-wrap gap-2">
          {actions.map((a) => (
            <Button
              key={a.status}
              size="sm"
              variant="outline"
              disabled={isPending}
              onClick={() => handleTransition(a.status)}
            >
              {a.label}
            </Button>
          ))}
          {canReschedule ? (
            <Sheet open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setRescheduleOpen(true)}
              >
                <Pencil className="size-3.5" />
                Reprogramar
              </Button>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>Reprogramar turno</SheetTitle>
                  <SheetDescription>
                    {appointment.clientName} — {appointment.zoneName}
                  </SheetDescription>
                </SheetHeader>
                <div className="flex flex-col gap-4 px-4 pb-4">
                  <RescheduleForm
                    action={boundReschedule}
                    currentScheduledAt={appointment.scheduledAt}
                    currentDurationMinutes={appointment.durationMinutes}
                    onSuccess={() => setRescheduleOpen(false)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
