"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { rescheduleAppointmentSchema } from "@/features/appointments/schema";
import { rescheduleAppointment } from "@/features/appointments/data/appointments";

export type RescheduleAppointmentFormState = { error: string | null };

/**
 * Server action backing the agenda's reschedule (change time) form — spec:
 * "Edit/reschedule an appointment". Re-validates server-side; a rejected
 * overlap comes back as `rescheduleAppointment`'s friendly mapped message,
 * never a raw Postgres error.
 */
export async function rescheduleAppointmentAction(
  appointmentId: string,
  _prevState: RescheduleAppointmentFormState,
  formData: FormData,
): Promise<RescheduleAppointmentFormState> {
  const parsed = rescheduleAppointmentSchema.safeParse({
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del turno.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();
  try {
    await rescheduleAppointment(supabase, appointmentId, parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo reprogramar el turno. Intentá de nuevo.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}
