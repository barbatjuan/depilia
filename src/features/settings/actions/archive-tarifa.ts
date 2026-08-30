"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { archiveTariff, restoreTariff } from "@/features/settings/data/tarifas";
import { mapTarifaError } from "@/features/settings/domain/tarifa-errors";

export type ArchiveTarifaState = { error: string | null };

function readId(formData: FormData): string | null {
  const id = formData.get("id");
  return typeof id === "string" && id ? id : null;
}

/** Row-level "Archivar" button — sets `active=false` (never hard-deletes). */
export async function archiveTarifaAction(
  _prevState: ArchiveTarifaState,
  formData: FormData,
): Promise<ArchiveTarifaState> {
  const id = readId(formData);
  if (!id) return { error: "Tarifa inválida." };

  const supabase = await createSupabaseClient();
  try {
    await archiveTariff(supabase, id);
  } catch {
    return { error: "No se pudo archivar la tarifa. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/tarifas");
  return { error: null };
}

/**
 * Row-level "Restaurar" button — sets `active=true`, guarded by the partial
 * unique index (`23505` when a conflicting active tariff now exists).
 */
export async function restoreTarifaAction(
  _prevState: ArchiveTarifaState,
  formData: FormData,
): Promise<ArchiveTarifaState> {
  const id = readId(formData);
  if (!id) return { error: "Tarifa inválida." };

  const supabase = await createSupabaseClient();
  try {
    await restoreTariff(supabase, id);
  } catch (error) {
    return {
      error: mapTarifaError(
        error as { code?: string | null; message?: string | null },
      ),
    };
  }

  revalidatePath("/configuracion/tarifas");
  return { error: null };
}
