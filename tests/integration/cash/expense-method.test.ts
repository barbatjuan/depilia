import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase } from "../helpers/fixtures";

const db = createServiceRoleClient();

async function seedCategory() {
  const { data } = await db
    .from("expense_categories")
    .insert({ name: `cat-${crypto.randomUUID()}` })
    .select("id")
    .single();
  return data!.id as string;
}

describe.sequential("expenses.method", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterEach(async () => {
    await resetDatabase(db);
  });
  afterAll(async () => {
    await resetDatabase(db);
  });

  it("defaults to 'cash' when no method is supplied", async () => {
    const categoryId = await seedCategory();
    const { data, error } = await db
      .from("expenses")
      .insert({ category_id: categoryId, amount: 1000, spent_on: "2026-01-10" })
      .select("method")
      .single();

    expect(error).toBeNull();
    expect(data?.method).toBe("cash");
  });

  it("accepts an explicit 'transfer' method and rejects an unknown one", async () => {
    const categoryId = await seedCategory();

    const ok = await db
      .from("expenses")
      .insert({
        category_id: categoryId,
        amount: 1000,
        spent_on: "2026-01-10",
        method: "transfer",
      })
      .select("method")
      .single();
    expect(ok.error).toBeNull();
    expect(ok.data?.method).toBe("transfer");

    const bad = await db.from("expenses").insert({
      category_id: categoryId,
      amount: 1000,
      spent_on: "2026-01-10",
      method: "bitcoin",
    });
    expect(bad.error).not.toBeNull();
    expect(bad.error?.code).toBe("23514");
  });
});
