import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedDiscountCode,
} from "../helpers/fixtures";
import { validateDiscountCode } from "@/features/discount-codes/data/discount-codes";
import { buildLooseSessionPayload } from "@/features/packages/domain/sell-package";
import { sellLooseSession } from "@/features/packages/data/sell-package";

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

describe.sequential("validateDiscountCode — advisory checkout pre-check", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterEach(async () => {
    await resetDatabase(db);
  });

  it("resolves an active, in-window, non-exhausted code case-insensitively", async () => {
    await seedDiscountCode(db, {
      code: "VERANO",
      kind: "percent",
      value: 10,
      max_uses: 100,
      used_count: 3,
    });
    const result = await validateDiscountCode(db, "verano", BA_TODAY());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.row.kind).toBe("percent");
      expect(result.row.value).toBe(10);
    }
  });

  it("returns unknown for a missing code", async () => {
    const result = await validateDiscountCode(db, "NOPE", BA_TODAY());
    expect(result).toEqual({ ok: false, reason: "unknown" });
  });

  it("returns inactive for an archived code", async () => {
    await seedDiscountCode(db, { code: "OFF", active: false });
    const result = await validateDiscountCode(db, "OFF", BA_TODAY());
    expect(result).toEqual({ ok: false, reason: "inactive" });
  });

  it("returns out_of_window when the BA business date is past valid_to", async () => {
    await seedDiscountCode(db, {
      code: "EXPIRED",
      valid_from: addDays(BA_TODAY(), -10),
      valid_to: addDays(BA_TODAY(), -1),
    });
    const result = await validateDiscountCode(db, "EXPIRED", BA_TODAY());
    expect(result).toEqual({ ok: false, reason: "out_of_window" });
  });

  it("returns exhausted when used_count has reached max_uses", async () => {
    await seedDiscountCode(db, { code: "FULL", max_uses: 2, used_count: 2 });
    const result = await validateDiscountCode(db, "FULL", BA_TODAY());
    expect(result).toEqual({ ok: false, reason: "exhausted" });
  });
});

describe.sequential("discount code at checkout — usage increments + void decrements", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterEach(async () => {
    await resetDatabase(db);
  });

  it("increments used_count on a code-bearing sale and returns it on void", async () => {
    const client = await seedClient(db, "Code Checkout");
    const code = await seedDiscountCode(db, {
      code: "CHECKOUT",
      kind: "fixed",
      value: 5,
      max_uses: 10,
      used_count: 0,
    });

    const payload = buildLooseSessionPayload(
      {
        templateId: null,
        templateName: "Sesión",
        zoneName: "Axilas",
        sessionPrice: 20,
        vatRate: 0.21,
        amount: null,
      },
      {
        kind: "fixed",
        value: 5,
        reason: "Código CHECKOUT",
        codeId: code.id,
        fractionDigits: 2,
      },
    );
    expect(payload).toMatchObject({
      listTotal: 20,
      total: 15,
      discountAmount: 5,
      discountCodeId: code.id,
    });

    const { saleId } = await sellLooseSession(db, {
      clientId: client.id,
      payload,
    });

    const afterSale = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(afterSale.data?.used_count).toBe(1);

    await db.from("sales").update({ status: "void" }).eq("id", saleId);
    const afterVoid = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(afterVoid.data?.used_count).toBe(0);
  });

  it("rejects the second use of a max_uses = 1 code at insert time", async () => {
    const client = await seedClient(db, "Race Client");
    const code = await seedDiscountCode(db, {
      code: "ONCE",
      kind: "fixed",
      value: 1,
      max_uses: 1,
      used_count: 0,
    });
    const mkPayload = () =>
      buildLooseSessionPayload(
        {
          templateId: null,
          templateName: "Sesión",
          zoneName: "Axilas",
          sessionPrice: 20,
          vatRate: 0.21,
          amount: null,
        },
        {
          kind: "fixed",
          value: 1,
          reason: "Código ONCE",
          codeId: code.id,
          fractionDigits: 2,
        },
      );

    await sellLooseSession(db, { clientId: client.id, payload: mkPayload() });
    await expect(
      sellLooseSession(db, { clientId: client.id, payload: mkPayload() }),
    ).rejects.toMatchObject({ code: "23514" });
  });
});
