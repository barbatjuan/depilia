"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { tariffUpdateSchema } from "@/features/settings/schema";
import { updateTariff } from "@/features/settings/data/tarifas";
import { mapTarifaError } from "@/features/settings/domain/tarifa-errors";
import type { TarifaFormState } from "@/features/settings/actions/create-tarifa";

/** Server action backing the "editar tarifa" form (size + prices only). */
export async function updateTarifaAction(
  tarifaId: string,
  _prevState: TarifaFormState,
  formData: FormData,
): Promise<TarifaFormState> {
  const parsed = tariffUpdateSchema.safeParse({
    sizeCategory: formData.get("sizeCategory"),
    sessionPrice: formData.get("sessionPrice"),
    bonoPrice: formData.get("bonoPrice"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    return {
      error:
        flat.formErrors[0] ??
        Object.values(flat.fieldErrors)[0]?.[0] ??
        "Revisá los datos del formulario.",
    };
  }

  const supabase = await createSupabaseClient();
  try {
    await updateTariff(supabase, tarifaId, parsed.data);
  } catch (error) {
    return {
      error: mapTarifaError(
        error as { code?: string | null; message?: string | null },
      ),
    };
  }

  revalidatePath("/configuracion/tarifas");
  redirect("/configuracion/tarifas");
}
