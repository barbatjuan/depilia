import type { AppSupabaseClient } from "@/lib/supabase/app-client";

export type ClaimReminderResult = { claimed: boolean; id: string | null };

/**
 * Atomically claims the right to send one appointment's reminder for
 * `sendDate` via the `reminder_log` unique
 * `(appointment_id, channel, send_date)` constraint:
 * `upsert(..., { ignoreDuplicates: true })` behaves like SQL's
 * `INSERT ... ON CONFLICT DO NOTHING RETURNING id`. A row is inserted (and
 * `claimed: true` returned) only on the first attempt for that appointment
 * + date; a repeated or concurrent attempt is a no-op — enforced by the
 * real Postgres unique index, not application logic (spec:
 * "appointment-reminders" / Idempotent on rerun).
 */
export async function claimReminder(
  supabase: AppSupabaseClient,
  params: { appointmentId: string; sendDate: string; channel?: string },
): Promise<ClaimReminderResult> {
  const channel = params.channel ?? "email";
  const { data, error } = await supabase
    .from("reminder_log")
    .upsert(
      {
        appointment_id: params.appointmentId,
        channel,
        send_date: params.sendDate,
        status: "pending",
      },
      { onConflict: "appointment_id,channel,send_date", ignoreDuplicates: true },
    )
    .select("id");
  if (error) throw error;

  const row = data?.[0];
  return { claimed: Boolean(row), id: row?.id ?? null };
}
