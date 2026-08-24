"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { RescheduleAppointmentFormState } from "@/features/appointments/actions/reschedule-appointment";

const initialState: RescheduleAppointmentFormState = { error: null };

/**
 * Reschedule (change time) form — spec: "Edit/reschedule an appointment".
 * The `datetime-local` input, like the booking form's, is always
 * interpreted as Buenos Aires local time.
 */
export function RescheduleForm({
  action,
  currentScheduledAt,
  currentDurationMinutes,
  onSuccess,
}: {
  action: (
    state: RescheduleAppointmentFormState,
    formData: FormData,
  ) => Promise<RescheduleAppointmentFormState>;
  currentScheduledAt: string;
  currentDurationMinutes: number;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [localDateTime, setLocalDateTime] = useState(() =>
    toBaLocalInputValue(currentScheduledAt),
  );
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (hasSubmitted && !isPending && state.error === null) {
      onSuccess?.();
    }
  }, [hasSubmitted, isPending, state, onSuccess]);

  const scheduledAtIso = localDateTime
    ? new Date(`${localDateTime}:00-03:00`).toISOString()
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="rescheduleDateTime">Nueva fecha y hora</Label>
          <Input
            id="rescheduleDateTime"
            type="datetime-local"
            value={localDateTime}
            onChange={(e) => setLocalDateTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="rescheduleDuration">Duración (min)</Label>
          <Input
            id="rescheduleDuration"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            defaultValue={currentDurationMinutes}
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
          {isPending ? "Guardando…" : "Guardar nuevo horario"}
        </Button>
      </div>
    </form>
  );
}

/** `2026-08-24T13:00:00Z` -> `2026-08-24T10:00` (the BA-local datetime-local value). */
function toBaLocalInputValue(iso: string): string {
  const date = new Date(iso);
  const baIso = new Date(date.getTime() - 3 * 60 * 60 * 1000).toISOString();
  return baIso.slice(0, 16);
}
