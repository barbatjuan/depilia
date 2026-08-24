"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { expenseCategorySchema } from "@/features/expenses/schema";
import { createExpenseCategory } from "@/features/expenses/data/categories";

export type CategoryFormState = { error: string | null };

/** Server action backing the "nueva categoría" form. */
export async function createCategoryAction(
  _prevState: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  const parsed = expenseCategorySchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del formulario.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();
  try {
    await createExpenseCategory(supabase, parsed.data);
  } catch {
    return { error: "No se pudo guardar la categoría. Intentá de nuevo." };
  }

  revalidatePath("/configuracion/categorias");
  redirect("/configuracion/categorias");
}
