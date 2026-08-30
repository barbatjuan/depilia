import { describe, expect, it } from "vitest";
import { ARQUEO_LABEL, deriveArqueo } from "@/features/cash/domain/arqueo";

describe("deriveArqueo", () => {
  it("reports a shortfall (faltante) when the count is below the theoretical", () => {
    expect(deriveArqueo(6800, 7000)).toEqual({
      difference: -200,
      status: "faltante",
    });
  });

  it("reports a surplus (sobrante) when the count is above the theoretical", () => {
    expect(deriveArqueo(7250, 7000)).toEqual({
      difference: 250,
      status: "sobrante",
    });
  });

  it("reports exacto when the count matches the theoretical", () => {
    expect(deriveArqueo(7000, 7000)).toEqual({ difference: 0, status: "exacto" });
  });

  it("treats a sub-cent rounding gap as exacto (|diff| < 0.005)", () => {
    expect(deriveArqueo(7000.004, 7000).status).toBe("exacto");
    expect(deriveArqueo(7000.006, 7000).status).toBe("sobrante");
  });
});

describe("ARQUEO_LABEL", () => {
  it("provides a Spanish label for every arqueo status", () => {
    expect(ARQUEO_LABEL.sobrante).toBe("Sobrante");
    expect(ARQUEO_LABEL.faltante).toBe("Faltante");
    expect(ARQUEO_LABEL.exacto).toBe("Caja cuadrada");
  });
});
