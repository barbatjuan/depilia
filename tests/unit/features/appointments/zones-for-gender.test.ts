import { describe, expect, it } from "vitest";
import { zonesForGender } from "@/features/appointments/domain/zones-for-gender";

const ZONES = [
  { id: "z-axilas", name: "Axilas", gender: "mujer" as const },
  { id: "z-axilas", name: "Axilas", gender: "hombre" as const },
  { id: "z-bikini", name: "Bikini", gender: "mujer" as const },
  { id: "z-barba", name: "Barba", gender: "hombre" as const },
];

describe("zonesForGender", () => {
  it("keeps only the zones offered for the selected gender", () => {
    expect(zonesForGender(ZONES, "hombre")).toEqual([
      { id: "z-axilas", name: "Axilas" },
      { id: "z-barba", name: "Barba" },
    ]);
  });

  it("sorts the result by zone name", () => {
    const names = zonesForGender(ZONES, "mujer").map((z) => z.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "es")));
  });

  it("dedupes zones that appear more than once for the same gender", () => {
    const dupes = [
      { id: "z-axilas", name: "Axilas", gender: "mujer" as const },
      { id: "z-axilas", name: "Axilas", gender: "mujer" as const },
    ];
    expect(zonesForGender(dupes, "mujer")).toEqual([
      { id: "z-axilas", name: "Axilas" },
    ]);
  });

  it("returns an empty list when nothing matches", () => {
    expect(zonesForGender(ZONES, "")).toEqual([]);
  });
});
