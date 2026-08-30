import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { getSessionForDate } from "@/features/cash/data/cash-session";
import { cashWithoutOpenSession } from "@/features/cash/domain/closed-caja-warning";

/**
 * Resolves where an expense action should redirect after a successful write.
 * The expense actions `redirect("/gastos")` and cannot return form state, so
 * a cash expense recorded with no open caja for its `spentOn` date carries
 * the advisory as a query param the page renders as a banner (design
 * decision 5 / deviation 6). The expense itself is already committed — any
 * failure of this check is swallowed and the plain `/gastos` target is used.
 */
export async function expenseRedirectTarget(
  supabase: AppSupabaseClient,
  input: { method: string; spentOn: string },
): Promise<string> {
  if (input.method !== "cash") return "/gastos";
  try {
    const openSession = await getSessionForDate(supabase, input.spentOn);
    return cashWithoutOpenSession({ method: input.method, openSession })
      ? "/gastos?aviso=caja-cerrada"
      : "/gastos";
  } catch {
    return "/gastos";
  }
}
