"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { sellLooseSessionSchema } from "@/features/packages/schema";
import { buildLooseSessionPayload } from "@/features/packages/domain/sell-package";
import { listActiveBodyZones } from "@/features/packages/data/package-templates";
import { sellLooseSession } from "@/features/packages/data/sell-package";

export type SellLooseSessionFormState = { error: string | null };

/**
 * Server action backing the "vender sesión suelta" ficha form. Bound with
 * the client id via `.bind(null, clientId)`. Creates a `sales` row with no
 * `client_package_id` — a one-off trial session, not a package.
 */
export async function sellLooseSessionAction(
  clientId: string,
  _prevState: SellLooseSessionFormState,
  formData: FormData,
): Promise<SellLooseSessionFormState> {
  const parsed = sellLooseSessionSchema.safeParse({
    clientId,
    zoneId: formData.get("zoneId"),
    price: formData.get("price"),
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
    const zones = await listActiveBodyZones(supabase);
    const zone = zones.find((z) => z.id === parsed.data.zoneId);
    if (!zone) {
      return { error: "La zona seleccionada ya no está disponible." };
    }

    const payload = buildLooseSessionPayload({
      zoneId: zone.id,
      zoneName: zone.name,
      price: parsed.data.price,
    });

    await sellLooseSession(supabase, { clientId, payload });
  } catch {
    return { error: "No se pudo registrar la sesión suelta." };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { error: null };
}
