"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { editAppointmentSchema } from "@/features/appointments/schema";
import { updateAppointment } from "@/features/appointments/data/appointments";

export type EditAppointmentFormState = { error: string | null };

/**
 * Server action backing the agenda's "editar turno" form (date/time,
 * duration, zone) for a still-scheduled appointment. A rejected overlap
 * comes back as `updateAppointment`'s friendly mapped message.
 */
export async function editAppointmentAction(
  appointmentId: string,
  _prevState: EditAppointmentFormState,
  formData: FormData,
): Promise<EditAppointmentFormState> {
  const parsed = editAppointmentSchema.safeParse({
    zoneId: formData.get("zoneId"),
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
    await updateAppointment(supabase, appointmentId, parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo guardar el turno. Intentá de nuevo.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}
