import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedPackageTemplate,
  seedPromotion,
  seedZone,
} from "../helpers/fixtures";

describe.sequential("0019 service_vat — defaults, CHECK bounds, backfill, combo RPC", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("defaults package_templates.vat_rate to 0.210 when not specified", async () => {
    const zone = await seedZone(db, "Axilas");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
    });
    expect(template.vat_rate).toBe(0.21);
  });

  it("rejects a package_templates.vat_rate outside [0, 1)", async () => {
    const zone = await seedZone(db, "Piernas");
    await expect(
      seedPackageTemplate(db, {
        zone_id: zone.id,
        name: "Piernas x6",
        default_sessions: 6,
        bono_price: 90000,
        vat_rate: 1,
      }),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      seedPackageTemplate(db, {
        zone_id: zone.id,
        name: "Piernas x6",
        default_sessions: 6,
        bono_price: 90000,
        vat_rate: -0.1,
      }),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("defaults clinic_settings.default_vat_rate to 0.210", async () => {
    const { data, error } = await db
      .from("clinic_settings")
      .insert({ id: true })
      .select("default_vat_rate")
      .single();
    expect(error).toBeNull();
    expect(data?.default_vat_rate).toBe(0.21);
  });

  it("defaults sales.vat_rate to 0.210 when not specified", async () => {
    const client = await seedClient(db, "Vat Client");
    const { data, error } = await db
      .from("sales")
      .insert({ client_id: client.id, description: "Suelta — Test", total: 15000 })
      .select("vat_rate")
      .single();
    expect(error).toBeNull();
    expect(data?.vat_rate).toBe(0.21);
  });

  it("create_combo_sale: p_vat_rate explicit wins over line tariffs", async () => {
    const zoneA = await seedZone(db, "Axilas");
    const zoneB = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Combo Vat Client");
    const promo = await seedPromotion(db, { kind: "combo" });
    const templateA = await seedPackageTemplate(db, {
      zone_id: zoneA.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
      vat_rate: 0.1,
    });
    const templateB = await seedPackageTemplate(db, {
      zone_id: zoneB.id,
      name: "Piernas x6",
      default_sessions: 6,
      bono_price: 90000,
      vat_rate: 0.1,
    });

    const { data: saleId, error } = await db.rpc("create_combo_sale", {
      p_client_id: client.id,
      p_promotion_id: promo.id,
      p_description: "Combo explicit rate",
      p_list_total: 150000,
      p_discount_amount: 0,
      p_lines: [
        { tariff_id: templateA.id, zone_id: zoneA.id, total_sessions: 6 },
        { tariff_id: templateB.id, zone_id: zoneB.id, total_sessions: 6 },
      ],
      p_vat_rate: 0.05,
    });
    expect(error).toBeNull();

    const { data: sale } = await db
      .from("sales")
      .select("vat_rate")
      .eq("id", saleId as string)
      .single();
    expect(sale?.vat_rate).toBe(0.05);
  });

  it("create_combo_sale: derives the shared line rate when every tariff agrees", async () => {
    const zoneA = await seedZone(db, "Axilas");
    const zoneB = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Combo Shared Rate Client");
    const promo = await seedPromotion(db, { kind: "combo" });
    const templateA = await seedPackageTemplate(db, {
      zone_id: zoneA.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
      vat_rate: 0.1,
    });
    const templateB = await seedPackageTemplate(db, {
      zone_id: zoneB.id,
      name: "Piernas x6",
      default_sessions: 6,
      bono_price: 90000,
      vat_rate: 0.1,
    });

    const { data: saleId, error } = await db.rpc("create_combo_sale", {
      p_client_id: client.id,
      p_promotion_id: promo.id,
      p_description: "Combo shared rate",
      p_list_total: 150000,
      p_discount_amount: 0,
      p_lines: [
        { tariff_id: templateA.id, zone_id: zoneA.id, total_sessions: 6 },
        { tariff_id: templateB.id, zone_id: zoneB.id, total_sessions: 6 },
      ],
    });
    expect(error).toBeNull();

    const { data: sale } = await db
      .from("sales")
      .select("vat_rate")
      .eq("id", saleId as string)
      .single();
    expect(sale?.vat_rate).toBe(0.1);
  });

  it("create_combo_sale: falls back to clinic_settings.default_vat_rate when line rates disagree", async () => {
    const zoneA = await seedZone(db, "Axilas");
    const zoneB = await seedZone(db, "Piernas");
    const client = await seedClient(db, "Combo Mixed Rate Client");
    const promo = await seedPromotion(db, { kind: "combo" });
    await db.from("clinic_settings").insert({ id: true, default_vat_rate: 0.15 });
    const templateA = await seedPackageTemplate(db, {
      zone_id: zoneA.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
      vat_rate: 0.1,
    });
    const templateB = await seedPackageTemplate(db, {
      zone_id: zoneB.id,
      name: "Piernas x6",
      default_sessions: 6,
      bono_price: 90000,
      vat_rate: 0.21,
    });

    const { data: saleId, error } = await db.rpc("create_combo_sale", {
      p_client_id: client.id,
      p_promotion_id: promo.id,
      p_description: "Combo mixed rate",
      p_list_total: 150000,
      p_discount_amount: 0,
      p_lines: [
        { tariff_id: templateA.id, zone_id: zoneA.id, total_sessions: 6 },
        { tariff_id: templateB.id, zone_id: zoneB.id, total_sessions: 6 },
      ],
    });
    expect(error).toBeNull();

    const { data: sale } = await db
      .from("sales")
      .select("vat_rate")
      .eq("id", saleId as string)
      .single();
    expect(sale?.vat_rate).toBe(0.15);
  });
});
