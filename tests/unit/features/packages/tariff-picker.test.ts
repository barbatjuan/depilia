import { describe, expect, it } from "vitest";
import {
  GENDER_LABEL,
  SIZE_LABEL,
  SIZE_ORDER,
  filterTariffs,
  groupTariffsBySize,
} from "@/features/packages/domain/tariff-picker";
import type { PackageTemplateOption } from "@/features/packages/domain/sell-package";

function tariff(
  o: Partial<PackageTemplateOption> & { id: string },
): PackageTemplateOption {
  return {
    zoneId: `zone-${o.id}`,
    zoneName: `Zona ${o.id}`,
    name: `Tarifa ${o.id}`,
    gender: "mujer",
    sizeCategory: "mediana",
    defaultSessions: 6,
    sessionPrice: 10,
    bonoPrice: 48,
    ...o,
  };
}

const catalog: PackageTemplateOption[] = [
  tariff({ id: "axilas-m", name: "Axilas", gender: "mujer", sizeCategory: "pequena" }),
  tariff({ id: "axilas-h", name: "Axilas", gender: "hombre", sizeCategory: "pequena" }),
  tariff({
    id: "ingles-completas",
    name: "Ingles Completas",
    gender: "mujer",
    sizeCategory: "pequena",
  }),
  tariff({
    id: "perfilado-barba",
    name: "Perfilado de barba",
    gender: "hombre",
    sizeCategory: "mini",
  }),
  tariff({ id: "labio-m", name: "Labio superior", gender: "mujer", sizeCategory: "mini" }),
  tariff({ id: "piernas-m", name: "Piernas completas", gender: "mujer", sizeCategory: "cuerpo" }),
];

describe("filterTariffs", () => {
  it("keeps only tariffs for the requested gender (mujer-only areas excluded for hombre)", () => {
    const result = filterTariffs(catalog, { gender: "hombre" });
    expect(result.map((t) => t.id).sort()).toEqual(
      ["axilas-h", "perfilado-barba"].sort(),
    );
    expect(result.some((t) => t.name === "Ingles Completas")).toBe(false);
  });

  it("keeps mujer-only areas and drops hombre-only areas when filtering for mujer", () => {
    const result = filterTariffs(catalog, { gender: "mujer" });
    expect(result.map((t) => t.id).sort()).toEqual(
      ["axilas-m", "ingles-completas", "labio-m", "piernas-m"].sort(),
    );
    expect(result.some((t) => t.name === "Perfilado de barba")).toBe(false);
  });

  it("narrows further by size_category when provided", () => {
    const result = filterTariffs(catalog, {
      gender: "mujer",
      sizeCategory: "mini",
    });
    expect(result.map((t) => t.id)).toEqual(["labio-m"]);
  });
});

describe("groupTariffsBySize", () => {
  it("returns groups ordered mini → pequena → mediana → grande → cuerpo regardless of input order", () => {
    const shuffled = [
      tariff({ id: "c", sizeCategory: "cuerpo" }),
      tariff({ id: "a", sizeCategory: "mini" }),
      tariff({ id: "b", sizeCategory: "pequena" }),
    ];
    expect(groupTariffsBySize(shuffled).map((g) => g.sizeCategory)).toEqual([
      "mini",
      "pequena",
      "cuerpo",
    ]);
  });

  it("omits size groups with no tariffs and carries each tariff under its size label", () => {
    const groups = groupTariffsBySize(
      filterTariffs(catalog, { gender: "mujer" }),
    );
    expect(groups.map((g) => g.sizeCategory)).toEqual([
      "mini",
      "pequena",
      "cuerpo",
    ]);
    const mini = groups.find((g) => g.sizeCategory === "mini");
    expect(mini?.label).toBe("Mini");
    expect(mini?.tariffs.map((t) => t.id)).toEqual(["labio-m"]);
  });
});

describe("label maps", () => {
  it("exposes Spanish gender labels", () => {
    expect(GENDER_LABEL.mujer).toBe("Mujer");
    expect(GENDER_LABEL.hombre).toBe("Hombre");
  });

  it("exposes Spanish size labels in canonical order", () => {
    expect(SIZE_ORDER).toEqual([
      "mini",
      "pequena",
      "mediana",
      "grande",
      "cuerpo",
    ]);
    expect(SIZE_ORDER.map((s) => SIZE_LABEL[s])).toEqual([
      "Mini",
      "Pequeña",
      "Mediana",
      "Grande",
      "Cuerpo",
    ]);
  });
});
