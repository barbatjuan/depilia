import type { AppSupabaseClient } from "@/lib/supabase/app-client";

/**
 * Appointment ids that already have a `reminder_log` row for `sendDate`
 * (any status — `pending`/`sent`/`failed` all mean a run already claimed
 * that appointment for the day, so this run must not attempt it again).
 */
export async function getAlreadyRemindedIds(
  supabase: AppSupabaseClient,
  sendDate: string,
  channel = "email",
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("reminder_log")
    .select("appointment_id")
    .eq("send_date", sendDate)
    .eq("channel", channel);
  if (error) throw error;

  return new Set((data ?? []).map((row) => row.appointment_id));
}
