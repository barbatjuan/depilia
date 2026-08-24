import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidCronSecret } from "@/features/reminders/domain/verify-cron-secret";
import { runReminderJob } from "@/features/reminders/data/run-reminder-job";

// Node runtime: the service-role admin client and Resend SDK are not
// Edge-compatible, and this route is single-tenant/low-frequency (design
// decision 7 — Vercel Cron over Supabase pg_cron/Edge Function).
export const runtime = "nodejs";

/**
 * Vercel Cron entry point (`vercel.json` -> `0 12 * * *`). Guarded by a
 * constant-time `CRON_SECRET` bearer check so it can't be triggered by an
 * arbitrary public request (design "Reminder Cron").
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!isValidCronSecret(authHeader, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const outcome = await runReminderJob(supabase);
  return NextResponse.json(outcome);
}
