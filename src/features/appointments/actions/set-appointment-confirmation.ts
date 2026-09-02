"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { setAppointmentConfirmation } from "@/features/appointments/data/appointments";

export type SetConfirmationResult = { error: string | null };

/**
 * Toggles a turno's confirmation flag (migration `0018`). Bound with the id
 * and the target state via `.bind(null, appointmentId, confirmed)`.
 */
export async function setAppointmentConfirmationAction(
  appointmentId: string,
  confirmed: boolean,
): Promise<SetConfirmationResult> {
  const supabase = await createSupabaseClient();
  try {
    await setAppointmentConfirmation(supabase, appointmentId, confirmed);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo actualizar la confirmación.",
    };
  }

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { error: null };
}
