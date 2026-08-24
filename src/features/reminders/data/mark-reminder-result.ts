import type { AppSupabaseClient } from "@/lib/supabase/app-client";

/**
 * Updates a claimed `reminder_log` row from `pending` to its final outcome
 * after the Resend send attempt. A `failed` row is intentionally left
 * re-claimable: it keeps its unique-key row so the same appointment/date
 * combo won't be double-inserted, but a future run's status is only ever
 * read as "already attempted" via `getAlreadyRemindedIds`, not retried
 * automatically within the same day — matching the design's stated
 * tradeoff of one send attempt per appointment per day.
 */
export async function markReminderResult(
  supabase: AppSupabaseClient,
  params: {
    reminderLogId: string;
    status: "sent" | "failed";
    providerMessageId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from("reminder_log")
    .update({
      status: params.status,
      provider_message_id: params.providerMessageId ?? null,
    })
    .eq("id", params.reminderLogId);
  if (error) throw error;
}
