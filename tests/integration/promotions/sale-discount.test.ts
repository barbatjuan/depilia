import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "../helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedPackageTemplate,
  seedStaffMember,
  seedZone,
} from "../helpers/fixtures";
import {
  buildLooseSessionPayload,
  buildPackageSalePayload,
} from "@/features/packages/domain/sell-package";
import { sellLooseSession, sellPackage } from "@/features/packages/data/sell-package";
import { getDashboardKpis } from "@/features/dashboard/data/get-kpis";

describe.sequential("per-sale manual discount — persistence + non-ripple", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });
  afterEach(async () => {
    await resetDatabase(db);
  });

  async function fixtures() {
    const zone = await seedZone(db, "Axilas");
    const client = await seedClient(db, "Desc Client");
    const staff = await seedStaffMember(db, { full_name: "Vendedora" });
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Axilas x6",
      default_sessions: 6,
      bono_price: 60000,
    });
    return { zone, client, staff, template };
  }

  function templateReq(templateId: string, zone: { id: string; name: string }) {
    return {
      source: "template" as const,
      template: {
        id: templateId,
        zoneId: zone.id,
        zoneName: zone.name,
        name: "Axilas x6",
        gender: "mujer" as const,
        sizeCategory: "pequena" as const,
        defaultSessions: 6,
        sessionPrice: 10000,
        bonoPrice: 60000,
        vatRate: 0.21,
      },
    };
  }

  it("persists list_total / discount_amount / discount_reason / discounted_by and keeps the money identity", async () => {
    const f = await fixtures();
    const payload = buildPackageSalePayload(templateReq(f.template.id, f.zone), {
      kind: "percent",
      value: 10,
      reason: "Cliente frecuente",
      by: f.staff.id,
      fractionDigits: 2,
    });

    const { saleId } = await sellPackage(db, { clientId: f.client.id, payload });

    const { data: sale } = await db
      .from("sales")
      .select(
        "total, list_total, discount_amount, discount_reason, discounted_by",
      )
      .eq("id", saleId)
      .single();

    expect(sale).toMatchObject({
      total: 54000,
      list_total: 60000,
      discount_amount: 6000,
      discount_reason: "Cliente frecuente",
      discounted_by: f.staff.id,
    });
  });

  it("defaults list_total = total, amount 0, reason/by null when no discount is applied", async () => {
    const f = await fixtures();
    const payload = buildPackageSalePayload(templateReq(f.template.id, f.zone));
    const { saleId } = await sellPackage(db, { clientId: f.client.id, payload });

    const { data: sale } = await db
      .from("sales")
      .select("total, list_total, discount_amount, discount_reason, discounted_by")
      .eq("id", saleId)
      .single();

    expect(sale).toMatchObject({
      total: 60000,
      list_total: 60000,
      discount_amount: 0,
      discount_reason: null,
      discounted_by: null,
    });
  });

  it("rejects a hand-crafted sale whose total breaks total = list_total - discount_amount", async () => {
    const f = await fixtures();
    const { error } = await db.from("sales").insert({
      client_id: f.client.id,
      description: "Bad money identity",
      total: 100,
      list_total: 120,
      discount_amount: 5,
    });
    expect(error).not.toBeNull();
    expect(error?.code).toBe("23514");
  });

  it("leaves sale_balances and the dashboard revenue KPI payment-driven (a discount only lowers the cap)", async () => {
    const f = await fixtures();

    const discounted = buildLooseSessionPayload(
      {
        templateId: f.template.id,
        templateName: "Axilas x6",
        zoneName: f.zone.name,
        sessionPrice: 20000,
        vatRate: 0.21,
        amount: null,
      },
      { kind: "fixed", value: 5000, reason: "Promo", by: f.staff.id, fractionDigits: 2 },
    );
    const { saleId } = await sellLooseSession(db, {
      clientId: f.client.id,
      payload: discounted,
    });

    const { data: balance } = await db
      .from("sale_balances")
      .select("balance, total")
      .eq("sale_id", saleId)
      .single();
    // sale_balances mirrors the charged amount (post-discount), never list_total
    expect(balance?.total).toBe(15000);
    expect(balance?.balance).toBe(15000);

    // no payments recorded -> revenue KPI is still zero, unaffected by the discount
    const kpis = await getDashboardKpis(db, new Date());
    expect(kpis.monthRevenue).toBe(0);
  });
});
