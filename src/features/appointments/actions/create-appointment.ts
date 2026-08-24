"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { createAppointmentSchema } from "@/features/appointments/schema";
import { createAppointment } from "@/features/appointments/data/appointments";

export type CreateAppointmentFormState = { error: string | null };

/**
 * Server action backing the agenda's "nuevo turno" form. Re-validates with
 * `createAppointmentSchema` server-side (the real boundary), persists, then
 * revalidates the agenda so the new appointment shows up immediately.
 */
export async function createAppointmentAction(
  _prevState: CreateAppointmentFormState,
  formData: FormData,
): Promise<CreateAppointmentFormState> {
  const parsed = createAppointmentSchema.safeParse({
    clientId: formData.get("clientId"),
    zoneId: formData.get("zoneId"),
    scheduledAt: formData.get("scheduledAt"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes"),
    clientPackageId: formData.get("clientPackageId"),
    looseSaleId: formData.get("looseSaleId"),
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
    await createAppointment(supabase, parsed.data);
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
