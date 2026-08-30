import { describe, expect, it } from "vitest";
import { mapTarifaError } from "@/features/settings/domain/tarifa-errors";

describe("mapTarifaError", () => {
  it("maps a 23505 unique violation to the (zona, género) message", () => {
    expect(mapTarifaError({ code: "23505" })).toBe(
      "Ya existe una tarifa activa para esa zona y género.",
    );
  });

  it("maps a 23514 check violation to the positive-price message", () => {
    expect(mapTarifaError({ code: "23514" })).toBe(
      "El precio debe ser mayor a 0.",
    );
  });

  it("falls back to a generic message for any other error", () => {
    expect(mapTarifaError({ code: "23503" })).toBe(
      "No se pudo guardar la tarifa. Intentá de nuevo.",
    );
    expect(mapTarifaError({})).toBe(
      "No se pudo guardar la tarifa. Intentá de nuevo.",
    );
  });
});
