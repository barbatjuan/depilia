"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/features/expenses/schema";
import { updateExpense } from "@/features/expenses/data/expenses";

export type ExpenseFormState = { error: string | null };

/**
 * Server action backing the "editar gasto" form. Bound with the expense id
 * via `.bind(null, expenseId)`, mirroring `updateClientAction`.
 */
export async function updateExpenseAction(
  expenseId: string,
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    spentOn: formData.get("spentOn"),
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
    await updateExpense(supabase, expenseId, parsed.data);
  } catch {
    return { error: "No se pudo actualizar el gasto. Intentá de nuevo." };
  }

  revalidatePath("/gastos");
  redirect("/gastos");
}
