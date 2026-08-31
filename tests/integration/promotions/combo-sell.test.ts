import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedPackageTemplate,
  seedPromotion,
  seedZone,
} from "../helpers/fixtures";

describe.sequential("0015 promotions — create_combo_sale RPC", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  async function seedComboFixtures() {
    const zoneA = await seedZone(db, "Axilas");
    const zoneB = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Combo Client");
    const templateA = await seedPackageTemplate(db, {
      zone_id: zoneA.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
    });
    const templateB = await seedPackageTemplate(db, {
      zone_id: zoneB.id,
      name: "Piernas x6",
      default_sessions: 6,
      bono_price: 90000,
    });
    const promo = await seedPromotion(db, { kind: "combo", name: "Combo Axilas+Piernas" });
    return { zoneA, zoneB, client, templateA, templateB, promo };
  }

  it("creates one sale + N client_packages + N sale_packages + a single sale_balances row", async () => {
    const f = await seedComboFixtures();

    const { data: saleId, error } = await db.rpc("create_combo_sale", {
      p_client_id: f.client.id,
      p_promotion_id: f.promo.id,
      p_description: "Combo Axilas + Piernas",
      p_list_total: 150000,
      p_discount_amount: 0,
      p_lines: [
        { tariff_id: f.templateA.id, zone_id: f.zoneA.id, total_sessions: 6 },
        { tariff_id: f.templateB.id, zone_id: f.zoneB.id, total_sessions: 6 },
      ],
    });
    expect(error).toBeNull();
    expect(saleId).toBeTruthy();

    const { data: sale } = await db
      .from("sales")
      .select("client_package_id, promotion_id, total, list_total")
      .eq("id", saleId as string)
      .single();
    expect(sale?.client_package_id).toBeNull();
    expect(sale?.promotion_id).toBe(f.promo.id);
    expect(sale?.total).toBe(150000);

    const { count: pkgCount } = await db
      .from("client_packages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", f.client.id);
    expect(pkgCount).toBe(2);

    const { data: joinRows } = await db
      .from("sale_packages")
      .select("client_package_id")
      .eq("sale_id", saleId as string);
    expect(joinRows).toHaveLength(2);

    const { data: balances } = await db
      .from("sale_balances")
      .select("sale_id, balance")
      .eq("sale_id", saleId as string);
    expect(balances).toHaveLength(1);
    const [balanceRow] = balances ?? [];
    expect(balanceRow?.balance).toBe(150000);
  });

  it("rolls the whole call back when one line is invalid (atomic)", async () => {
    const f = await seedComboFixtures();

    const { error } = await db.rpc("create_combo_sale", {
      p_client_id: f.client.id,
      p_promotion_id: f.promo.id,
      p_description: "Combo with a bad line",
      p_list_total: 150000,
      p_discount_amount: 0,
      p_lines: [
        { tariff_id: f.templateA.id, zone_id: f.zoneA.id, total_sessions: 6 },
        {
          tariff_id: f.templateB.id,
          zone_id: "00000000-0000-0000-0000-000000000000",
          total_sessions: 6,
        },
      ],
    });
    expect(error).not.toBeNull();

    const { count: saleCount } = await db
      .from("sales")
      .select("id", { count: "exact", head: true })
      .eq("client_id", f.client.id);
    expect(saleCount).toBe(0);

    const { count: pkgCount } = await db
      .from("client_packages")
      .select("id", { count: "exact", head: true })
      .eq("client_id", f.client.id);
    expect(pkgCount).toBe(0);
  });

  it("applies an extra discount on top of the combo list price", async () => {
    const f = await seedComboFixtures();
    const { data: saleId, error } = await db.rpc("create_combo_sale", {
      p_client_id: f.client.id,
      p_promotion_id: f.promo.id,
      p_description: "Combo with manual discount",
      p_list_total: 150000,
      p_discount_amount: 15000,
      p_discount_reason: "Cliente frecuente",
      p_lines: [
        { tariff_id: f.templateA.id, zone_id: f.zoneA.id, total_sessions: 6 },
        { tariff_id: f.templateB.id, zone_id: f.zoneB.id, total_sessions: 6 },
      ],
    });
    expect(error).toBeNull();
    const { data: sale } = await db
      .from("sales")
      .select("total, list_total, discount_amount, discount_reason")
      .eq("id", saleId as string)
      .single();
    expect(sale).toMatchObject({
      total: 135000,
      list_total: 150000,
      discount_amount: 15000,
      discount_reason: "Cliente frecuente",
    });
  });
});
