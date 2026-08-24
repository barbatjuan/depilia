import { describe, expect, it } from "vitest";
import {
  buildPackageSalePayload,
  buildLooseSessionPayload,
} from "@/features/packages/domain/sell-package";

describe("buildPackageSalePayload", () => {
  it("derives totals from a package template (spec: package sale creates client_package)", () => {
    const payload = buildPackageSalePayload({
      source: "template",
      template: {
        id: "tpl-1",
        zoneId: "zone-1",
        zoneName: "Axilas",
        name: "Axilas x6",
        defaultSessions: 6,
        price: 60000,
      },
    });

    expect(payload).toEqual({
      templateId: "tpl-1",
      zoneId: "zone-1",
      totalSessions: 6,
      price: 60000,
      description: "Paquete Axilas x6 — 6 sesiones (Axilas)",
    });
  });

  it("derives totals from an ad-hoc zone + session count (no template)", () => {
    const payload = buildPackageSalePayload({
      source: "custom",
      zoneId: "zone-2",
      zoneName: "Piernas",
      sessionCount: 8,
      price: 90000,
    });

    expect(payload).toEqual({
      templateId: null,
      zoneId: "zone-2",
      totalSessions: 8,
      price: 90000,
      description: "Paquete a medida — 8 sesiones (Piernas)",
    });
  });

  it("rejects an ad-hoc sale with zero or negative session count", () => {
    expect(() =>
      buildPackageSalePayload({
        source: "custom",
        zoneId: "zone-2",
        zoneName: "Piernas",
        sessionCount: 0,
        price: 90000,
      }),
    ).toThrow("La cantidad de sesiones debe ser un entero mayor a 0");
  });

  it("rejects an ad-hoc sale with a non-positive price", () => {
    expect(() =>
      buildPackageSalePayload({
        source: "custom",
        zoneId: "zone-2",
        zoneName: "Piernas",
        sessionCount: 4,
        price: 0,
      }),
    ).toThrow("El precio debe ser mayor a 0");
  });
});

describe("buildLooseSessionPayload", () => {
  it("builds a loose-session sale payload tied only to client + zone (no client_package)", () => {
    const payload = buildLooseSessionPayload({
      zoneId: "zone-3",
      zoneName: "Rostro",
      price: 15000,
    });

    expect(payload).toEqual({
      description: "Sesión suelta — Rostro",
      price: 15000,
    });
  });

  it("rejects a loose session with a non-positive price", () => {
    expect(() =>
      buildLooseSessionPayload({
        zoneId: "zone-3",
        zoneName: "Rostro",
        price: -1,
      }),
    ).toThrow("El precio debe ser mayor a 0");
  });
});
