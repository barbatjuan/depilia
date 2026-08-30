import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { ExpenseInput, ExpenseMethod } from "@/features/expenses/schema";

export type ExpenseRow = {
  id: string;
  categoryId: string;
  categoryName: string;
  amount: number;
  description: string | null;
  spentOn: string;
  method: ExpenseMethod;
};

const SELECT_COLUMNS =
  "id, category_id, amount, description, spent_on, method, expense_categories(name)";

function toExpenseRow(row: {
  id: string;
  category_id: string;
  amount: number;
  description: string | null;
  spent_on: string;
  method: string;
  expense_categories: { name: string } | { name: string }[] | null;
}): ExpenseRow {
  const category = Array.isArray(row.expense_categories)
    ? row.expense_categories[0]
    : row.expense_categories;
  return {
    id: row.id,
    categoryId: row.category_id,
    categoryName: category?.name ?? "Sin categoría",
    amount: row.amount,
    description: row.description,
    spentOn: row.spent_on,
    method: row.method as ExpenseMethod,
  };
}

/**
 * Lists expenses, most recent first, optionally scoped to a `[from, to)`
 * `spent_on` date range (e.g. the current month, per
 * `domain/month-total.currentMonthRange`).
 */
export async function listExpenses(
  supabase: AppSupabaseClient,
  range?: { from?: string; to?: string },
): Promise<ExpenseRow[]> {
  let query = supabase
    .from("expenses")
    .select(SELECT_COLUMNS)
    .order("spent_on", { ascending: false });

  if (range?.from) query = query.gte("spent_on", range.from);
  if (range?.to) query = query.lt("spent_on", range.to);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(toExpenseRow);
}

export async function getExpense(
  supabase: AppSupabaseClient,
  id: string,
): Promise<ExpenseRow | null> {
  const { data, error } = await supabase
    .from("expenses")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toExpenseRow(data) : null;
}

export async function createExpense(
  supabase: AppSupabaseClient,
  input: ExpenseInput,
): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      category_id: input.categoryId,
      amount: input.amount,
      description: input.description || null,
      spent_on: input.spentOn,
      method: input.method,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toExpenseRow(data);
}

export async function updateExpense(
  supabase: AppSupabaseClient,
  id: string,
  input: ExpenseInput,
): Promise<ExpenseRow> {
  const { data, error } = await supabase
    .from("expenses")
    .update({
      category_id: input.categoryId,
      amount: input.amount,
      description: input.description || null,
      spent_on: input.spentOn,
      method: input.method,
    })
    .eq("id", id)
    .select(SELECT_COLUMNS)
    .single();
  if (error) throw error;
  return toExpenseRow(data);
}

export async function deleteExpense(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) throw error;
}
