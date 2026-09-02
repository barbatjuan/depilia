import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import { resetDatabase, seedClient, seedLooseSale } from "../helpers/fixtures";
import { getAccountingYear } from "@/features/accounting/data/accounting-year";

const db = createServiceRoleClient();

describe.sequential("getAccountingYear", () => {
  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("excludes payments against a void sale via the sales!inner(status) filter", async () => {
    const client = await seedClient(db, "Ana");
    const openSale = await seedLooseSale(db, { client_id: client.id, total: 1000 });
    const voidSale = await seedLooseSale(db, { client_id: client.id, total: 500 });
    await db.from("sales").update({ status: "void" }).eq("id", voidSale.id);

    await db.from("payments").insert([
      { sale_id: openSale.id, amount: 1000, paid_at: "2026-06-10T13:00:00Z", method: "cash" },
      { sale_id: voidSale.id, amount: 500, paid_at: "2026-06-11T13:00:00Z", method: "cash" },
    ]);

    const result = await getAccountingYear(db, "2026-06");

    expect(result.payments).toHaveLength(1);
    expect(result.payments[0]!.amount).toBe(1000);
  });

  it("spans from December of the previous year through the end of monthKey", async () => {
    const client = await seedClient(db, "Ana");
    const decSale = await seedLooseSale(db, { client_id: client.id, total: 100 });
    const juneSale = await seedLooseSale(db, { client_id: client.id, total: 200 });
    const julySale = await seedLooseSale(db, { client_id: client.id, total: 300 });

    await db.from("payments").insert([
      { sale_id: decSale.id, amount: 100, paid_at: "2025-12-15T13:00:00Z", method: "cash" },
      { sale_id: juneSale.id, amount: 200, paid_at: "2026-06-15T13:00:00Z", method: "cash" },
      { sale_id: julySale.id, amount: 300, paid_at: "2026-07-05T13:00:00Z", method: "cash" },
    ]);

    const result = await getAccountingYear(db, "2026-06");
    const amounts = result.payments.map((p) => p.amount).sort((a, b) => a - b);

    expect(amounts).toEqual([100, 200]);
  });

  it("scopes expenses by spent_on over the same window", async () => {
    const { data: category } = await db
      .from("expense_categories")
      .insert({ name: "Insumos" })
      .select("id")
      .single();

    await db.from("expenses").insert([
      { category_id: category!.id, amount: 50, spent_on: "2026-06-10", method: "cash" },
      { category_id: category!.id, amount: 999, spent_on: "2025-11-30", method: "cash" },
    ]);

    const result = await getAccountingYear(db, "2026-06");

    expect(result.expenses).toHaveLength(1);
    expect(result.expenses[0]).toEqual({ amount: 50, spentOn: "2026-06-10" });
  });
});
