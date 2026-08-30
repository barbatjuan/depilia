"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { expenseSchema } from "@/features/expenses/schema";
import { createExpense } from "@/features/expenses/data/expenses";

export type ExpenseFormState = { error: string | null };

/**
 * Server action backing the "nuevo gasto" form. Re-validates with
 * `expenseSchema` server-side, persists, revalidates the list, and redirects
 * back to `/gastos`.
 */
export async function createExpenseAction(
  _prevState: ExpenseFormState,
  formData: FormData,
): Promise<ExpenseFormState> {
  const parsed = expenseSchema.safeParse({
    categoryId: formData.get("categoryId"),
    amount: formData.get("amount"),
    description: formData.get("description"),
    spentOn: formData.get("spentOn"),
    method: formData.get("method") ?? undefined,
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
    await createExpense(supabase, parsed.data);
  } catch {
    return { error: "No se pudo guardar el gasto. Intentá de nuevo." };
  }

  revalidatePath("/gastos");
  redirect("/gastos");
}
