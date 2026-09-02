import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { monthRange } from "@/features/accounting/domain/period";
import {
  listAppointmentsInRange,
  type AppointmentListRow,
} from "@/features/appointments/data/appointments";

export async function getMonthlyAppointments(
  supabase: AppSupabaseClient,
  monthKey: string,
): Promise<AppointmentListRow[]> {
  const range = monthRange(monthKey);
  return listAppointmentsInRange(supabase, {
    start: new Date(range.startUtc),
    end: new Date(range.endUtc),
  });
}
