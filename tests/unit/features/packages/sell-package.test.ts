import { describe, expect, it } from "vitest";
import { buildPackageSalePayload } from "@/features/packages/domain/sell-package";

describe("buildPackageSalePayload", () => {
  it("derives totals from a package template (spec: package sale creates client_package)", () => {
    const payload = buildPackageSalePayload({
      source: "template",
      template: {
        id: "tpl-1",
        zoneId: "zone-1",
        zoneName: "Axilas",
        name: "Axilas x6",
        gender: "mujer",
        sizeCategory: "pequena",
        defaultSessions: 6,
        sessionPrice: 10000,
        bonoPrice: 60000,
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

  it("always sells the 6-session bono: total = bono_price even when session_price differs (spec R7)", () => {
    const payload = buildPackageSalePayload({
      source: "template",
      template: {
        id: "tpl-9",
        zoneId: "zone-9",
        zoneName: "Cavado",
        name: "Cavado",
        gender: "mujer",
        sizeCategory: "mini",
        defaultSessions: 6,
        sessionPrice: 10,
        bonoPrice: 48,
      },
    });

    expect(payload.totalSessions).toBe(6);
    expect(payload.price).toBe(48);
    expect(payload.templateId).toBe("tpl-9");
  });
});
