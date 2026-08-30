"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { tariffSchema } from "@/features/settings/schema";
import { createTariff } from "@/features/settings/data/tarifas";
import { mapTarifaError } from "@/features/settings/domain/tarifa-errors";

export type TarifaFormState = { error: string | null };

function firstIssue(
  parsed: ReturnType<typeof tariffSchema.safeParse>,
): string {
  if (parsed.success) return "Revisá los datos del formulario.";
  const flat = parsed.error.flatten();
  return (
    flat.formErrors[0] ??
    Object.values(flat.fieldErrors)[0]?.[0] ??
    "Revisá los datos del formulario."
  );
}

/** Server action backing the "nueva tarifa" form. */
export async function createTarifaAction(
  _prevState: TarifaFormState,
  formData: FormData,
): Promise<TarifaFormState> {
  const parsed = tariffSchema.safeParse({
    zoneName: formData.get("zoneName"),
    gender: formData.get("gender"),
    sizeCategory: formData.get("sizeCategory"),
    sessionPrice: formData.get("sessionPrice"),
    bonoPrice: formData.get("bonoPrice"),
  });

  if (!parsed.success) return { error: firstIssue(parsed) };

  const supabase = await createSupabaseClient();
  try {
    await createTariff(supabase, parsed.data);
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
