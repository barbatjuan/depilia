"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { listAppointmentsInRange } from "@/features/appointments/data/appointments";
import { getClinicDayBounds } from "@/features/dashboard/domain/schedule";
import { quarterHourSlots } from "@/features/appointments/domain/time-slots";
import { availableSlots } from "@/features/appointments/domain/available-slots";

const CLINIC_OPEN_HOUR = 8;
const CLINIC_CLOSE_HOUR = 20;

/**
 * Free `"HH:mm"` slots for the booking/edit time picker on a given
 * (BA-local) calendar `date`, given the duration the caller wants to book.
 * `excludeAppointmentId` lets an edit ignore its own current slot.
 */
export async function getAvailableSlotsAction(
  date: string,
  durationMinutes: number,
  excludeAppointmentId?: string,
): Promise<string[]> {
  const allSlots = quarterHourSlots(CLINIC_OPEN_HOUR, CLINIC_CLOSE_HOUR);
  if (!date) return allSlots;

  const supabase = await createSupabaseClient();
  const bounds = getClinicDayBounds(new Date(`${date}T12:00:00Z`));
  const dayAppointments = await listAppointmentsInRange(supabase, bounds);

  return availableSlots(allSlots, dayAppointments, {
    durationMinutes,
    excludeAppointmentId,
  });
}
