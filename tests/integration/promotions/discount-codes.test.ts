import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedDiscountCode,
} from "../helpers/fixtures";

const BA_TODAY = () =>
  new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
    }),
  )
    .toISOString()
    .slice(0, 10);

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

describe.sequential("0015 promotions — discount-code usage triggers", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function insertCodeSale(codeId: string) {
    const client = await seedClient(db);
    return db
      .from("sales")
      .insert({
        client_id: client.id,
        description: "Code sale",
        total: 100,
        list_total: 100,
        discount_amount: 0,
        discount_code_id: codeId,
      } as never)
      .select("id")
      .single();
  }

  it("lets exactly one of two concurrent inserts consume a max_uses = 1 code", async () => {
    const code = await seedDiscountCode(db, { max_uses: 1, used_count: 0 });
    const results = await Promise.allSettled([
      insertCodeSale(code.id),
      insertCodeSale(code.id),
    ]);
    const oks = results.filter(
      (r) => r.status === "fulfilled" && r.value.error === null,
    );
    const errs = results.filter(
      (r) => r.status === "fulfilled" && r.value.error !== null,
    );
    expect(oks).toHaveLength(1);
    expect(errs).toHaveLength(1);

    const { data: fresh } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(fresh?.used_count).toBe(1);
  });

  it("rejects a further sale once the code is exhausted", async () => {
    const code = await seedDiscountCode(db, { max_uses: 1 });
    await insertCodeSale(code.id);
    const { error } = await insertCodeSale(code.id);
    expect(error?.message.toLowerCase()).toContain("exhausted");
  });

  it("rejects an inactive code", async () => {
    const code = await seedDiscountCode(db, { active: false });
    const { error } = await insertCodeSale(code.id);
    expect(error?.message.toLowerCase()).toContain("inactive");
  });

  it("rejects a code whose BA-date window has already closed", async () => {
    const yesterday = addDays(BA_TODAY(), -1);
    const code = await seedDiscountCode(db, {
      valid_from: addDays(BA_TODAY(), -10),
      valid_to: yesterday,
    });
    const { error } = await insertCodeSale(code.id);
    expect(error?.message.toLowerCase()).toContain("out_of_window");
  });

  it("accepts and increments a code that is inside its BA-date window", async () => {
    const code = await seedDiscountCode(db, {
      valid_from: addDays(BA_TODAY(), -1),
      valid_to: addDays(BA_TODAY(), 1),
    });
    const { error } = await insertCodeSale(code.id);
    expect(error).toBeNull();
    const { data: fresh } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(fresh?.used_count).toBe(1);
  });

  it("returns the use when a code-bearing sale is voided (floor 0)", async () => {
    const code = await seedDiscountCode(db, { max_uses: 5 });
    const sale = await insertCodeSale(code.id);
    await db.from("sales").update({ status: "void" }).eq("id", sale.data!.id);
    const { data: afterVoid } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(afterVoid?.used_count).toBe(0);

    // A second void transition must not drive used_count negative.
    await db.from("sales").update({ status: "void" }).eq("id", sale.data!.id);
    const { data: stillZero } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(stillZero?.used_count).toBe(0);
  });

  it("does not touch any code counter when a non-code sale is voided", async () => {
    const code = await seedDiscountCode(db, { max_uses: 5, used_count: 3 });
    const client = await seedClient(db);
    const sale = await db
      .from("sales")
      .insert({
        client_id: client.id,
        description: "No code",
        total: 100,
        list_total: 100,
        discount_amount: 0,
      } as never)
      .select("id")
      .single();
    await db.from("sales").update({ status: "void" }).eq("id", sale.data!.id);
    const { data: fresh } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(fresh?.used_count).toBe(3);
  });
});
