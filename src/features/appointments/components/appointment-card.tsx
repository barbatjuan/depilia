"use client";

import { useState, useTransition } from "react";
import { Check, Pencil, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { EditAppointmentForm } from "@/features/appointments/components/edit-appointment-form";
import { editAppointmentAction } from "@/features/appointments/actions/edit-appointment";
import { setAppointmentConfirmationAction } from "@/features/appointments/actions/set-appointment-confirmation";
import { setAppointmentStatusAction } from "@/features/appointments/actions/set-appointment-status";
import {
  STATUS_LABEL,
  type AppointmentStatus,
} from "@/features/appointments/domain/status";
import type { AppointmentListRow } from "@/features/appointments/data/appointments";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";

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
  hour12: false,
});

const STATUS_DOT: Record<string, string> = {
  scheduled: "bg-primary",
  completed: "bg-success",
  cancelled: "bg-muted-foreground/40",
  no_show: "bg-warning",
};

/**
 * A single agenda appointment: time, client, zone, status + confirmation
 * badges, the transition buttons allowed from its current status (task:
 * "call the right status transition" — never a raw `UPDATE`), an "Editar"
 * trigger (date / time / zone) and a confirm toggle.
 *
 * `variant="compact"` (week view) renders a click-to-open button; the sheet
 * body is identical for both variants.
 */
export function AppointmentCard({
  appointment,
  zones,
  variant = "full",
}: {
  appointment: AppointmentListRow;
  zones: BodyZoneOption[];
  variant?: "full" | "compact";
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const status = appointment.status as AppointmentStatus;
  const actions = NEXT_STATUS_ACTIONS[status] ?? [];
  const canEdit = status === "scheduled";
  const isConfirmed = appointment.confirmedAt !== null;

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

  function handleConfirmToggle() {
    setError(null);
    startTransition(async () => {
      const result = await setAppointmentConfirmationAction(
        appointment.id,
        !isConfirmed,
      );
      if (result.error) setError(result.error);
    });
  }

  const boundEdit = editAppointmentAction.bind(null, appointment.id);
  const time = timeFormatter.format(new Date(appointment.scheduledAt));

  const header = (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="tnum shrink-0 text-sm font-medium whitespace-nowrap text-muted-foreground">
          {time}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {appointment.clientName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {appointment.zoneName}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
          {STATUS_LABEL[status] ?? status}
        </Badge>
        {status === "scheduled" ? (
          <Badge variant={isConfirmed ? "success" : "outline"}>
            {isConfirmed ? "Confirmada" : "Sin confirmar"}
          </Badge>
        ) : null}
      </div>
    </div>
  );

  const errorNode = error ? (
    <p role="alert" className="text-xs text-destructive">
      {error}
    </p>
  ) : null;

  const controls: React.ReactNode[] = [];

  if (status === "scheduled") {
    controls.push(
      <Button
        key="confirm"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={handleConfirmToggle}
      >
        {isConfirmed ? (
          <>
            <X className="size-3.5" />
            Quitar confirmación
          </>
        ) : (
          <>
            <Check className="size-3.5" />
            Confirmar
          </>
        )}
      </Button>,
    );
  }

  for (const a of actions) {
    controls.push(
      <Button
        key={a.status}
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => handleTransition(a.status)}
      >
        {a.label}
      </Button>,
    );
  }

  if (canEdit) {
    controls.push(
      <Sheet key="edit" open={editOpen} onOpenChange={setEditOpen}>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="size-3.5" />
          Editar
        </Button>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Editar turno</SheetTitle>
            <SheetDescription>
              {appointment.clientName} — {appointment.zoneName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <EditAppointmentForm
              action={boundEdit}
              appointmentId={appointment.id}
              currentScheduledAt={appointment.scheduledAt}
              currentDurationMinutes={appointment.durationMinutes}
              currentZoneId={appointment.zoneId}
              zones={zones}
              onSuccess={() => setEditOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>,
    );
  }

  const controlsRow =
    controls.length > 0 ? (
      <div className="flex flex-wrap gap-2">{controls}</div>
    ) : null;

  if (variant === "compact") {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-md border border-border/60 bg-card px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-accent/40"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${STATUS_DOT[status] ?? "bg-muted-foreground/40"}`}
            />
            <span className="tnum shrink-0 text-xs font-semibold">{time}</span>
            <span className="truncate text-xs text-muted-foreground">
              {appointment.clientName}
            </span>
          </button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Turno</SheetTitle>
            <SheetDescription>
              {appointment.clientName} — {appointment.zoneName}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            {header}
            {errorNode}
            {controlsRow}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    // NOTE: e2e's `appointmentCardLocator` (golden-path.spec.ts) matches this
    // element by exact class name (`div.rounded-md.border.p-3`) — keep those
    // three classes present verbatim if this element's styling changes again.
    <div className="flex flex-col gap-2 rounded-md border border-border/60 bg-card p-3">
      {header}
      {errorNode}
      {controlsRow}
    </div>
  );
}
