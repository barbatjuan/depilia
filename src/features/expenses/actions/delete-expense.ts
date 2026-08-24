"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { deleteExpense } from "@/features/expenses/data/expenses";

export type DeleteFormState = { error: string | null };

/** Server action backing the "eliminar gasto" button on `/gastos`. */
export async function deleteExpenseAction(
  _prevState: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const id = formData.get("id");
  if (typeof id !== "string" || !id) {
    return { error: "Gasto inválido." };
  }

  const supabase = await createSupabaseClient();
  try {
    await deleteExpense(supabase, id);
  } catch {
    return { error: "No se pudo eliminar el gasto. Intentá de nuevo." };
  }

  revalidatePath("/gastos");
  return { error: null };
}
