import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import {
  getReminderSendDate,
  getReminderWindowBounds,
} from "@/features/reminders/domain/reminder-window";
import { selectAppointmentsNeedingReminder } from "@/features/reminders/domain/select-reminders";
import { getCandidateAppointments } from "@/features/reminders/data/get-candidate-appointments";
import { getAlreadyRemindedIds } from "@/features/reminders/data/get-already-reminded-ids";
import { claimReminder } from "@/features/reminders/data/claim-reminder";
import { markReminderResult } from "@/features/reminders/data/mark-reminder-result";
import { sendReminderEmail } from "@/features/reminders/data/send-reminder-email";

export type ReminderJobOutcome = {
  sendDate: string;
  candidates: number;
  sent: number;
  skippedNoEmail: number;
  skippedResendNotConfigured: number;
  alreadyClaimed: number;
  failed: number;
};

/**
 * Runs one daily reminder batch: find appointments ~24h out (BA tz) without
 * a reminder logged yet, claim each one via the `reminder_log` unique
 * constraint, send via Resend, and record the outcome. A client with no
 * email on file is skipped (logged, not thrown) so one bad record never
 * aborts the rest of the day's batch (spec: "appointment-reminders").
 */
export async function runReminderJob(
  supabase: AppSupabaseClient,
  now = new Date(),
): Promise<ReminderJobOutcome> {
  const window = getReminderWindowBounds(now);
  const sendDate = getReminderSendDate(now);

  const [candidateAppointments, alreadyRemindedIds] = await Promise.all([
    getCandidateAppointments(supabase, window),
    getAlreadyRemindedIds(supabase, sendDate),
  ]);

  const eligible = selectAppointmentsNeedingReminder({
    appointments: candidateAppointments,
    now,
    alreadyRemindedIds,
  });

  const outcome: ReminderJobOutcome = {
    sendDate,
    candidates: eligible.length,
    sent: 0,
    skippedNoEmail: 0,
    skippedResendNotConfigured: 0,
    alreadyClaimed: 0,
    failed: 0,
  };

  for (const appointment of eligible) {
    if (!appointment.clientEmail) {
      console.log(
        `[reminders] appointment ${appointment.id} has no client email on file — skipping`,
      );
      outcome.skippedNoEmail += 1;
      continue;
    }

    const claim = await claimReminder(supabase, {
      appointmentId: appointment.id,
      sendDate,
    });
    if (!claim.claimed || !claim.id) {
      outcome.alreadyClaimed += 1;
      continue;
    }

    const result = await sendReminderEmail({
      to: appointment.clientEmail,
      clientName: appointment.clientName,
      scheduledAt: appointment.scheduledAt,
      zoneName: appointment.zoneName,
    });

    if (result.status === "sent") {
      await markReminderResult(supabase, {
        reminderLogId: claim.id,
        status: "sent",
        providerMessageId: result.providerMessageId,
      });
      outcome.sent += 1;
    } else if (result.status === "skipped") {
      // Resend isn't configured (local/dev). Leave the row `pending` so a
      // later run with real credentials can still claim... except the
      // unique constraint already claimed it for this send_date. Mark it
      // `sent` (no-op-sent) so it isn't retried forever without config —
      // the operator fixes env vars, not this row.
      await markReminderResult(supabase, {
        reminderLogId: claim.id,
        status: "sent",
        providerMessageId: null,
      });
      outcome.skippedResendNotConfigured += 1;
    } else {
      await markReminderResult(supabase, {
        reminderLogId: claim.id,
        status: "failed",
      });
      outcome.failed += 1;
      console.log(
        `[reminders] failed to send reminder for appointment ${appointment.id}: ${result.reason}`,
      );
    }
  }

  return outcome;
}
