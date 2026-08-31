import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedDiscountCode,
  seedPackageTemplate,
  seedPromotion,
  seedPromotionItem,
  seedZone,
} from "../helpers/fixtures";
import { withPgClient } from "../helpers/pg";

describe.sequential("0015 promotions — sales money model + table constraints", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function insertSale(overrides: Record<string, unknown>) {
    const client = await seedClient(db);
    return db
      .from("sales")
      .insert({
        client_id: client.id,
        description: "Test sale",
        ...overrides,
      } as never)
      .select("id, total, list_total, discount_amount")
      .single();
  }

  it("rejects a sale whose total != list_total - discount_amount (sales_money_identity)", async () => {
    const { error } = await insertSale({
      total: 90,
      list_total: 100,
      discount_amount: 5,
    });
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toContain("sales_money_identity");
  });

  it("accepts a sale where total = list_total - discount_amount", async () => {
    const { data, error } = await insertSale({
      total: 95,
      list_total: 100,
      discount_amount: 5,
    });
    expect(error).toBeNull();
    expect(data).toMatchObject({ total: 95, list_total: 100, discount_amount: 5 });
  });

  it("rejects a negative discount_amount", async () => {
    const { error } = await insertSale({
      total: 105,
      list_total: 100,
      discount_amount: -5,
    });
    expect(error).not.toBeNull();
  });

  it("rejects a fully-comped sale (total <= 0) via the existing total > 0 CHECK", async () => {
    const { error } = await insertSale({
      total: 0,
      list_total: 100,
      discount_amount: 100,
    });
    expect(error).not.toBeNull();
  });

  it("allows a 119.99 total on a 120 list price (0.01 floor honoured)", async () => {
    const { data, error } = await insertSale({
      total: 119.99,
      list_total: 120,
      discount_amount: 0.01,
    });
    expect(error).toBeNull();
    expect(data?.total).toBe(119.99);
  });

  it("backfills list_total = total on rows inserted without an explicit list_total", async () => {
    const { data, error } = await insertSale({ total: 60000 });
    expect(error).toBeNull();
    expect(data?.list_total).toBe(60000);
    expect(data?.discount_amount).toBe(0);
  });

  it("guarantees list_total is always present (CHECK + default trigger)", async () => {
    await withPgClient(async (c) => {
      const res = await c.query(
        `select conname from pg_constraint
          where conrelid = 'sales'::regclass and conname = 'sales_list_total_present'`,
      );
      expect(res.rows).toHaveLength(1);
    });
    // An explicit NULL is rewritten to total by the BEFORE INSERT trigger.
    const { data, error } = await insertSale({ total: 4200, list_total: null });
    expect(error).toBeNull();
    expect(data?.list_total).toBe(4200);
  });

  it("enforces partial unique (promotion_id, tariff_id) on promotion_items", async () => {
    const zone = await seedZone(db, "Axilas");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
    });
    const promo = await seedPromotion(db, { kind: "combo" });
    await seedPromotionItem(db, { promotion_id: promo.id, tariff_id: template.id });
    const { error } = await db
      .from("promotion_items")
      .insert({ promotion_id: promo.id, tariff_id: template.id, bonus_sessions: 0 });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23505");
  });

  it("enforces a unique active code on lower(code) but allows an archived duplicate", async () => {
    await seedDiscountCode(db, { code: "VERANO", active: true });
    const dup = await db
      .from("discount_codes")
      .insert({ code: "verano", kind: "percent", value: 10, active: true });
    expect(dup.error?.code).toBe("23505");

    const archived = await db
      .from("discount_codes")
      .insert({ code: "verano", kind: "percent", value: 10, active: false });
    expect(archived.error).toBeNull();
  });

  it("enforces UNIQUE(client_package_id) on sale_packages", async () => {
    const zone = await seedZone(db, "Piernas");
    const client = await seedClient(db);
    const pkg = await db
      .from("client_packages")
      .insert({ client_id: client.id, zone_id: zone.id, total_sessions: 6 })
      .select("id")
      .single();
    const sale1 = await insertSale({ total: 100, list_total: 100, discount_amount: 0 });
    const sale2 = await insertSale({ total: 100, list_total: 100, discount_amount: 0 });
    const first = await db
      .from("sale_packages")
      .insert({ sale_id: sale1.data!.id, client_package_id: pkg.data!.id });
    expect(first.error).toBeNull();
    const second = await db
      .from("sale_packages")
      .insert({ sale_id: sale2.data!.id, client_package_id: pkg.data!.id });
    expect(second.error?.code).toBe("23505");
  });

  it("enforces discount_codes CHECKs (value > 0, max_uses > 0, cap)", async () => {
    expect(
      (await db.from("discount_codes").insert({ code: "A", kind: "percent", value: 0 }))
        .error,
    ).not.toBeNull();
    expect(
      (
        await db
          .from("discount_codes")
          .insert({ code: "B", kind: "fixed", value: 5, max_uses: 0 })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await db.from("discount_codes").insert({
          code: "C",
          kind: "fixed",
          value: 5,
          max_uses: 1,
          used_count: 2,
        })
      ).error,
    ).not.toBeNull();
  });

  it("enforces promotion_items CHECKs (bonus_sessions >= 0, override_price > 0)", async () => {
    const zone = await seedZone(db, "Rostro");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Rostro x6",
      default_sessions: 6,
      bono_price: 40000,
    });
    const promo = await seedPromotion(db, { kind: "bonus" });
    expect(
      (
        await db.from("promotion_items").insert({
          promotion_id: promo.id,
          tariff_id: template.id,
          bonus_sessions: -1,
        })
      ).error,
    ).not.toBeNull();
    expect(
      (
        await db.from("promotion_items").insert({
          promotion_id: promo.id,
          tariff_id: template.id,
          bonus_sessions: 0,
          override_price: 0,
        })
      ).error,
    ).not.toBeNull();
  });

  it("blocks deleting a tariff still referenced by a promotion_item (ON DELETE RESTRICT)", async () => {
    const zone = await seedZone(db, "Bozo");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Bozo x6",
      default_sessions: 6,
      bono_price: 20000,
    });
    const promo = await seedPromotion(db, { kind: "combo" });
    await seedPromotionItem(db, { promotion_id: promo.id, tariff_id: template.id });
    const { error } = await db.from("package_templates").delete().eq("id", template.id);
    expect(error).not.toBeNull();
  });

  it("cascade-deletes promotion_items when their promotion is deleted", async () => {
    const zone = await seedZone(db, "Espalda");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Espalda x6",
      default_sessions: 6,
      bono_price: 30000,
    });
    const promo = await seedPromotion(db, { kind: "combo" });
    await seedPromotionItem(db, { promotion_id: promo.id, tariff_id: template.id });
    await db.from("promotions").delete().eq("id", promo.id);
    const { count } = await db
      .from("promotion_items")
      .select("id", { count: "exact", head: true })
      .eq("promotion_id", promo.id);
    expect(count).toBe(0);
  });
});
