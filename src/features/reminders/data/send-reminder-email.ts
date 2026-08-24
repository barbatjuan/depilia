import { Resend } from "resend";
import { formatInTimeZone } from "date-fns-tz";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";

export type SendReminderEmailParams = {
  to: string;
  clientName: string;
  scheduledAt: string;
  zoneName: string;
};

export type SendReminderEmailResult =
  | { status: "sent"; providerMessageId: string | null }
  | { status: "skipped"; reason: string }
  | { status: "failed"; reason: string };

/**
 * Thin Resend boundary. This repo has no real Resend account for local
 * dev, so a missing `RESEND_API_KEY`/`RESEND_FROM_EMAIL` is a graceful
 * no-op (logged, "skipped") rather than a crash — the cron batch must keep
 * processing the rest of the day's reminders either way.
 */
export async function sendReminderEmail(
  params: SendReminderEmailParams,
): Promise<SendReminderEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    console.log(
      `[reminders] RESEND_API_KEY/RESEND_FROM_EMAIL not configured — skipping reminder email to ${params.to}`,
    );
    return { status: "skipped", reason: "resend_not_configured" };
  }

  const resend = new Resend(apiKey);
  const localTime = formatInTimeZone(
    new Date(params.scheduledAt),
    CLINIC_TZ,
    "d/M/yyyy HH:mm",
  );

  const { data, error } = await resend.emails.send({
    from,
    to: params.to,
    subject: "Recordatorio de tu turno",
    text: `Hola ${params.clientName}, te recordamos tu turno de ${params.zoneName} el ${localTime}.`,
  });

  if (error) {
    return { status: "failed", reason: error.message };
  }
  return { status: "sent", providerMessageId: data?.id ?? null };
}
