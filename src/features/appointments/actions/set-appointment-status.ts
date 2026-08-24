"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { appointmentStatusSchema } from "@/features/appointments/schema";
import { setAppointmentStatus } from "@/features/appointments/data/appointments";
import {
  canTransitionAppointmentStatus,
  describeStatusTransitionError,
  type AppointmentStatus,
} from "@/features/appointments/domain/status";

export type SetAppointmentStatusResult = { error: string | null };

/**
 * Server action wiring the agenda's "completado" / "cancelado" / "no show"
 * buttons to the `set_appointment_status` RPC (design decision 2 — the
 * `appointments_session_ledger` trigger, already built and tested in PR1,
 * is the only thing that ever touches `sessions_used`; this action never
 * reimplements that logic, it only calls the right transition). Validates
 * the transition against the UI decision table first so a stale button
 * (e.g. double-click after another tab already cancelled the appointment)
 * surfaces a clear Spanish message instead of an RPC round trip.
 */
export async function setAppointmentStatusAction(
  appointmentId: string,
  currentStatus: AppointmentStatus,
  nextStatus: string,
): Promise<SetAppointmentStatusResult> {
  const parsed = appointmentStatusSchema.safeParse(nextStatus);
  if (!parsed.success) {
    return { error: "Estado de turno inválido." };
  }

  const transitionError = describeStatusTransitionError(
    currentStatus,
    parsed.data,
  );
  if (transitionError) {
    return { error: transitionError };
  }
  if (!canTransitionAppointmentStatus(currentStatus, parsed.data)) {
    return { error: transitionError ?? "Transición de estado no permitida." };
  }

  const supabase = await createSupabaseClient();
  try {
    await setAppointmentStatus(supabase, appointmentId, parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar el estado del turno.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  revalidatePath("/clientes/[id]", "page");
  return { error: null };
}
