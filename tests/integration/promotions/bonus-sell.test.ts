import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedDiscountCode,
  seedPackageTemplate,
  seedPromotion,
  seedPromotionItem,
  seedStaffMember,
  seedZone,
} from "../helpers/fixtures";
import { listActiveBonusPromotions } from "@/features/promotions/data/promotions";
import { buildPackageSalePayload } from "@/features/packages/domain/sell-package";
import { sellPackage } from "@/features/packages/data/sell-package";

const BUSINESS_DATE = "2026-06-15";

describe.sequential("single-zone bonus promotion sell path", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterEach(async () => {
    await resetDatabase(db);
  });

  async function fixtures() {
    const zone = await seedZone(db, "Axilas");
    const client = await seedClient(db, "Bonus Client");
    const staff = await seedStaffMember(db, { full_name: "Vendedora" });
    const tariff = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
    });
    return { zone, client, staff, tariff };
  }

  async function firstBonusOption() {
    const rows = await listActiveBonusPromotions(db, BUSINESS_DATE);
    const option = rows[0];
    if (!option) throw new Error("expected a bonus promotion in the list");
    return option;
  }

  it("lists an active in-window bonus promotion with its tariff snapshot", async () => {
    const f = await fixtures();
    const promo = await seedPromotion(db, {
      name: "6+2 gratis",
      kind: "bonus",
      valid_from: "2026-01-01",
      valid_to: "2026-12-31",
    });
    await seedPromotionItem(db, {
      promotion_id: promo.id,
      tariff_id: f.tariff.id,
      bonus_sessions: 2,
    });

    const rows = await listActiveBonusPromotions(db, BUSINESS_DATE);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: promo.id,
      name: "6+2 gratis",
      bonusSessions: 2,
      overridePrice: null,
      tariff: { id: f.tariff.id, zoneId: f.zone.id, defaultSessions: 6, bonoPrice: 60000 },
    });
  });

  it("excludes inactive, out-of-window, and combo promotions", async () => {
    const f = await fixtures();
    const inactive = await seedPromotion(db, { kind: "bonus", active: false });
    await seedPromotionItem(db, { promotion_id: inactive.id, tariff_id: f.tariff.id, bonus_sessions: 2 });
    const past = await seedPromotion(db, {
      kind: "bonus",
      valid_from: "2025-01-01",
      valid_to: "2025-12-31",
    });
    await seedPromotionItem(db, { promotion_id: past.id, tariff_id: f.tariff.id, bonus_sessions: 2 });
    const combo = await seedPromotion(db, { kind: "combo" });
    await seedPromotionItem(db, { promotion_id: combo.id, tariff_id: f.tariff.id, bonus_sessions: 0 });

    const rows = await listActiveBonusPromotions(db, BUSINESS_DATE);
    expect(rows).toHaveLength(0);
  });

  it("sells a bonus promo through the 2-insert path with boosted total_sessions and promotion_id", async () => {
    const f = await fixtures();
    const promo = await seedPromotion(db, { name: "6+2 gratis", kind: "bonus" });
    await seedPromotionItem(db, {
      promotion_id: promo.id,
      tariff_id: f.tariff.id,
      bonus_sessions: 2,
    });
    const option = await firstBonusOption();

    const payload = buildPackageSalePayload({
      source: "promotion",
      promotionId: option.id,
      promotionName: option.name,
      tariff: option.tariff,
      bonusSessions: option.bonusSessions,
      overridePrice: option.overridePrice,
    });
    const { clientPackageId, saleId } = await sellPackage(db, {
      clientId: f.client.id,
      payload,
    });

    const { data: pkg } = await db
      .from("client_packages")
      .select("total_sessions, zone_id")
      .eq("id", clientPackageId)
      .single();
    expect(pkg).toMatchObject({ total_sessions: 8, zone_id: f.zone.id });

    const { data: sale } = await db
      .from("sales")
      .select("promotion_id, total, list_total, discount_amount")
      .eq("id", saleId)
      .single();
    expect(sale).toMatchObject({
      promotion_id: promo.id,
      total: 60000,
      list_total: 60000,
      discount_amount: 0,
    });
  });

  it("allows a discount code on top of a bonus promo (promotion_id + discount_code_id, used_count++)", async () => {
    const f = await fixtures();
    const promo = await seedPromotion(db, { name: "6+2 gratis", kind: "bonus" });
    await seedPromotionItem(db, {
      promotion_id: promo.id,
      tariff_id: f.tariff.id,
      bonus_sessions: 2,
    });
    const code = await seedDiscountCode(db, { code: "VERANO", kind: "percent", value: 10, max_uses: 5 });
    const option = await firstBonusOption();

    const payload = buildPackageSalePayload(
      {
        source: "promotion",
        promotionId: option.id,
        promotionName: option.name,
        tariff: option.tariff,
        bonusSessions: option.bonusSessions,
        overridePrice: option.overridePrice,
      },
      {
        kind: "percent",
        value: 10,
        reason: "Código VERANO",
        by: f.staff.id,
        fractionDigits: 2,
        codeId: code.id,
      },
    );
    const { saleId } = await sellPackage(db, { clientId: f.client.id, payload });

    const { data: sale } = await db
      .from("sales")
      .select("promotion_id, discount_code_id, total, list_total, discount_amount")
      .eq("id", saleId)
      .single();
    expect(sale).toMatchObject({
      promotion_id: promo.id,
      discount_code_id: code.id,
      total: 54000,
      list_total: 60000,
      discount_amount: 6000,
    });

    const { data: refreshed } = await db
      .from("discount_codes")
      .select("used_count")
      .eq("id", code.id)
      .single();
    expect(refreshed?.used_count).toBe(1);
  });
});
