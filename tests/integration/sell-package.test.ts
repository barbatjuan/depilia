import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createServiceRoleClient } from "./helpers/supabase";
import {
  resetDatabase,
  seedClient,
  seedPackageTemplate,
  seedZone,
} from "./helpers/fixtures";
import {
  sellLooseSession,
  sellPackage,
} from "@/features/packages/data/sell-package";
import { buildPackageSalePayload } from "@/features/packages/domain/sell-package";

describe.sequential("sell-package data layer", () => {
  const db = createServiceRoleClient();

  beforeEach(async () => {
    await resetDatabase(db);
  });

  afterEach(async () => {
    await resetDatabase(db);
  });

  it("creates a client_packages row with sessions_used=0 and a matching sales row (spec: package sale)", async () => {
    const zone = await seedZone(db, "Axilas");
    const client = await seedClient(db, "Ana");
    const template = await seedPackageTemplate(db, {
      zone_id: zone.id,
      name: "Axilas x6",
      default_sessions: 6,
      price: 60000,
    });

    const payload = buildPackageSalePayload({
      source: "template",
      template: {
        id: template.id,
        zoneId: zone.id,
        zoneName: zone.name,
        name: template.name,
        defaultSessions: template.default_sessions,
        price: template.price,
      },
    });

    const result = await sellPackage(db, {
      clientId: client.id,
      payload,
    });

    const { data: pkgRow, error: pkgError } = await db
      .from("client_packages")
      .select("client_id, zone_id, template_id, total_sessions, sessions_used")
      .eq("id", result.clientPackageId)
      .single();
    if (pkgError) throw pkgError;

    expect(pkgRow).toEqual({
      client_id: client.id,
      zone_id: zone.id,
      template_id: template.id,
      total_sessions: 6,
      sessions_used: 0,
    });

    const { data: saleRow, error: saleError } = await db
      .from("sales")
      .select("client_id, client_package_id, total, description")
      .eq("id", result.saleId)
      .single();
    if (saleError) throw saleError;

    expect(saleRow).toEqual({
      client_id: client.id,
      client_package_id: result.clientPackageId,
      total: 60000,
      description: "Paquete Axilas x6 — 6 sesiones (Axilas)",
    });
  });

  it("creates only a sales row (no client_packages row) for a loose session (spec: sell a loose session)", async () => {
    const zone = await seedZone(db, "Rostro");
    const client = await seedClient(db, "Luz");

    const before = await db
      .from("client_packages")
      .select("id", { count: "exact", head: true });

    const result = await sellLooseSession(db, {
      clientId: client.id,
      payload: {
        description: `Sesión suelta — ${zone.name}`,
        price: 15000,
      },
    });

    const after = await db
      .from("client_packages")
      .select("id", { count: "exact", head: true });

    expect(after.count).toBe(before.count);

    const { data: saleRow, error } = await db
      .from("sales")
      .select("client_id, client_package_id, appointment_id, total")
      .eq("id", result.saleId)
      .single();
    if (error) throw error;

    expect(saleRow).toEqual({
      client_id: client.id,
      client_package_id: null,
      appointment_id: null,
      total: 15000,
    });
  });
});
