"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  archiveExpenseCategory,
  deleteExpenseCategory,
} from "@/features/expenses/data/categories";
import { mapCategoryDeleteError } from "@/features/expenses/domain/category-delete-errors";

export type DeleteFormState = { error: string | null };

/**
 * Server action backing the "eliminar categoría" button. Attempts a hard
 * delete first; the DB's `ON DELETE RESTRICT` FK rejects it when expenses
 * still reference the category (design decision 6). That raw Postgres error
 * is mapped to a friendly Spanish message here — it never reaches the UI —
 * and the caller is told to archive instead rather than losing the action.
 */
export async function deleteCategoryAction(
  _prevState: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Categoría inválida." };
  }

  const supabase = await createSupabaseClient();
  try {
    await deleteExpenseCategory(supabase, id);
  } catch (error) {
    return {
      error: mapCategoryDeleteError(
        error as { code?: string | null; message?: string | null },
      ),
    };
  }

  revalidatePath("/configuracion/categorias");
  return { error: null };
}

/**
 * Server action backing the "archivar categoría" fallback, offered when a
 * hard delete is blocked by expense history.
 */
export async function archiveCategoryAction(
  _prevState: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Categoría inválida." };
  }

  const supabase = await createSupabaseClient();
  try {
    await archiveExpenseCategory(supabase, id);
  } catch {
    return { error: "No se pudo archivar la categoría. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/categorias");
  return { error: null };
}
