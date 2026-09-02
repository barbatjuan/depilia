"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { EditAppointmentFormState } from "@/features/appointments/actions/edit-appointment";
import { getAvailableSlotsAction } from "@/features/appointments/actions/get-available-slots";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";
import { snapToQuarter } from "@/features/appointments/domain/time-slots";

const initialState: EditAppointmentFormState = { error: null };

/** `2026-08-24T13:00:00Z` → `{ date: "2026-08-24", time: "10:00" }` (BA local). */
function toBaParts(iso: string): { date: string; time: string } {
  const baIso = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
    .toISOString();
  return { date: baIso.slice(0, 10), time: snapToQuarter(baIso.slice(11, 16)) };
}

/**
 * Full edit of a scheduled turno — date, 15-minute time slot, duration and
 * zone. Replaces the old time-only reschedule form.
 */
export function EditAppointmentForm({
  action,
  appointmentId,
  currentScheduledAt,
  currentDurationMinutes,
  currentZoneId,
  zones,
  onSuccess,
}: {
  action: (
    state: EditAppointmentFormState,
    formData: FormData,
  ) => Promise<EditAppointmentFormState>;
  appointmentId: string;
  currentScheduledAt: string;
  currentDurationMinutes: number;
  currentZoneId: string;
  zones: BodyZoneOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const initial = toBaParts(currentScheduledAt);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);
  const [durationMinutes, setDurationMinutes] = useState(currentDurationMinutes);
  const [zoneId, setZoneId] = useState(currentZoneId);
  const [availableSlots, setAvailableSlots] = useState<string[]>([initial.time]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (hasSubmitted && !isPending && state.error === null) {
      onSuccess?.();
    }
  }, [hasSubmitted, isPending, state, onSuccess]);

  useEffect(() => {
    let cancelled = false;
    getAvailableSlotsAction(date, durationMinutes, appointmentId).then((slots) => {
      if (cancelled) return;
      setAvailableSlots(slots);
      setTime((current) => (current && !slots.includes(current) ? "" : current));
    });
    return () => {
      cancelled = true;
    };
  }, [date, durationMinutes, appointmentId]);

  const scheduledAtIso =
    date && time
      ? new Date(`${date}T${time}:00-03:00`).toISOString()
      : "";

  return (
    <form
      action={(formData) => {
        setHasSubmitted(true);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
      <input type="hidden" name="zoneId" value={zoneId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="editZone">Zona</Label>
        <Select value={zoneId} onValueChange={setZoneId}>
          <SelectTrigger id="editZone" className="w-full">
            <SelectValue placeholder="Elegí una zona" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="editDate">Fecha</Label>
        <Input
          id="editDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="editTime">Hora</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="editTime" className="w-full">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {availableSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="editDuration">Duración (min)</Label>
          <Input
            id="editDuration"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}
