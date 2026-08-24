import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import { resetDatabase } from "./helpers/fixtures";

describe.sequential("expense_categories RESTRICT on delete with history", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("deletes a category with no expenses", async () => {
    const { data: category, error: insertError } = await db
      .from("expense_categories")
      .insert({ name: "Alquiler" })
      .select()
      .single();
    if (insertError) throw insertError;

    const { error } = await db.from("expense_categories").delete().eq("id", category.id);
    expect(error).toBeNull();

    const { data: remaining } = await db
      .from("expense_categories")
      .select("id")
      .eq("id", category.id);
    expect(remaining).toEqual([]);
  });

  it("restricts deletion of a category referenced by existing expenses", async () => {
    const { data: category, error: insertError } = await db
      .from("expense_categories")
      .insert({ name: "Insumos" })
      .select()
      .single();
    if (insertError) throw insertError;

    const { error: expenseError } = await db.from("expenses").insert({
      category_id: category.id,
      amount: 5000,
      spent_on: "2026-08-01",
      description: "Guantes",
    });
    if (expenseError) throw expenseError;

    const { error } = await db.from("expense_categories").delete().eq("id", category.id);

    expect(error).not.toBeNull();

    const { data: stillThere } = await db
      .from("expense_categories")
      .select("id")
      .eq("id", category.id)
      .single();
    expect(stillThere?.id).toBe(category.id);

    const { data: expensesIntact } = await db
      .from("expenses")
      .select("category_id")
      .eq("category_id", category.id);
    expect(expensesIntact).toHaveLength(1);
  });
});
