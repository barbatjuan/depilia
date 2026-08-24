import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { ExpenseCategoryInput } from "@/features/expenses/schema";

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  archived: boolean;
};

/** Active (non-archived) categories, for the expense form's dropdown. */
export async function listActiveExpenseCategories(
  supabase: AppSupabaseClient,
): Promise<ExpenseCategoryRow[]> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name, archived")
    .eq("archived", false)
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** All categories, including archived ones, for the management screen. */
export async function listAllExpenseCategories(
  supabase: AppSupabaseClient,
): Promise<ExpenseCategoryRow[]> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name, archived")
    .order("archived", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getExpenseCategory(
  supabase: AppSupabaseClient,
  id: string,
): Promise<ExpenseCategoryRow | null> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("id, name, archived")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createExpenseCategory(
  supabase: AppSupabaseClient,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategoryRow> {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ name: input.name })
    .select("id, name, archived")
    .single();
  if (error) throw error;
  return data;
}

export async function updateExpenseCategory(
  supabase: AppSupabaseClient,
  id: string,
  input: ExpenseCategoryInput,
): Promise<ExpenseCategoryRow> {
  const { data, error } = await supabase
    .from("expense_categories")
    .update({ name: input.name })
    .eq("id", id)
    .select("id, name, archived")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Hard-deletes a category. The DB's `ON DELETE RESTRICT` FK (migration
 * `0007_expenses.sql`) rejects this when expenses still reference it — the
 * caller (server action) maps that raw error via
 * `domain/category-delete-errors.mapCategoryDeleteError` instead of letting
 * it reach the UI.
 */
export async function deleteExpenseCategory(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("expense_categories")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

/**
 * Soft-delete fallback (design decision 6: "UI delete archives when
 * referenced"). Archiving does not remove the row — it just excludes the
 * category from `listActiveExpenseCategories`'s dropdown while existing
 * expenses keep their reference intact.
 */
export async function archiveExpenseCategory(
  supabase: AppSupabaseClient,
  id: string,
): Promise<void> {
  const { error } = await supabase
    .from("expense_categories")
    .update({ archived: true })
    .eq("id", id);
  if (error) throw error;
}
