import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import { resetDatabase, seedClient } from "./helpers/fixtures";

describe.sequential("overpayment rejection trigger on payments", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function seedSale(total: number) {
    const client = await seedClient(db);
    const { data: sale, error } = await db
      .from("sales")
      .insert({ client_id: client.id, description: "Loose session", total })
      .select()
      .single();
    if (error) throw error;
    return sale;
  }

  it("accepts a payment that exactly covers the remaining balance", async () => {
    const sale = await seedSale(100000);

    const { error } = await db
      .from("payments")
      .insert({ sale_id: sale.id, amount: 100000, method: "cash" });

    expect(error).toBeNull();

    const { data: balance } = await db
      .from("sale_balances")
      .select("balance")
      .eq("sale_id", sale.id)
      .single();
    expect(balance?.balance).toBe(0);
  });

  it("accepts partial installments and derives balance after each", async () => {
    const sale = await seedSale(100000);

    await db.from("payments").insert({ sale_id: sale.id, amount: 40000, method: "cash" });
    const { data: afterFirst } = await db
      .from("sale_balances")
      .select("balance")
      .eq("sale_id", sale.id)
      .single();
    expect(afterFirst?.balance).toBe(60000);

    await db.from("payments").insert({ sale_id: sale.id, amount: 60000, method: "transfer" });
    const { data: afterSecond } = await db
      .from("sale_balances")
      .select("balance")
      .eq("sale_id", sale.id)
      .single();
    expect(afterSecond?.balance).toBe(0);
  });

  it("rejects a payment that would exceed the sale total", async () => {
    const sale = await seedSale(100000);
    await db.from("payments").insert({ sale_id: sale.id, amount: 70000, method: "cash" });

    const { error } = await db
      .from("payments")
      .insert({ sale_id: sale.id, amount: 40000, method: "cash" });

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("exceed");

    const { data: balance } = await db
      .from("sale_balances")
      .select("balance")
      .eq("sale_id", sale.id)
      .single();
    expect(balance?.balance).toBe(30000);
  });
});
