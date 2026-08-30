"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { sellLooseSessionSchema } from "@/features/packages/schema";
import { buildLooseSessionPayload } from "@/features/packages/domain/sell-package";
import { listActivePackageTemplates } from "@/features/packages/data/package-templates";
import { sellLooseSession } from "@/features/packages/data/sell-package";

export type SellLooseSessionFormState = { error: string | null };

/**
 * Server action backing the "vender sesión suelta" ficha form. Bound with
 * the client id via `.bind(null, clientId)`. The operator picks a tariff;
 * the amount is prefilled from the tariff's `session_price` and editable.
 * Creates a `sales` row with no `client_package_id` — a one-off session,
 * not a package.
 */
export async function sellLooseSessionAction(
  clientId: string,
  _prevState: SellLooseSessionFormState,
  formData: FormData,
): Promise<SellLooseSessionFormState> {
  const parsed = sellLooseSessionSchema.safeParse({
    clientId,
    templateId: formData.get("templateId"),
    amount: formData.get("amount"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos de la sesión.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  try {
    const templates = await listActivePackageTemplates(supabase);
    const template = templates.find((t) => t.id === parsed.data.templateId);
    if (!template) {
      return { error: "La tarifa seleccionada ya no está disponible." };
    }

    const payload = buildLooseSessionPayload({
      templateId: template.id,
      templateName: template.name,
      zoneName: template.zoneName,
      sessionPrice: template.sessionPrice,
      amount: parsed.data.amount,
    });

    await sellLooseSession(supabase, { clientId, payload });
  } catch {
    return { error: "No se pudo registrar la sesión suelta." };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { error: null };
}
