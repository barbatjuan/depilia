import { describe, expect, it } from "vitest";
import { groupTariffsForList } from "@/features/settings/domain/tariff-list";
import type { SizeCategory } from "@/features/packages/domain/sell-package";

function row(id: string, sizeCategory: SizeCategory) {
  return { id, sizeCategory };
}

describe("groupTariffsForList", () => {
  it("groups rows by size in canonical order, dropping empty groups", () => {
    const groups = groupTariffsForList([
      row("a", "cuerpo"),
      row("b", "mini"),
      row("c", "mini"),
      row("d", "grande"),
    ]);

    expect(groups.map((g) => g.sizeCategory)).toEqual([
      "mini",
      "grande",
      "cuerpo",
    ]);
    expect(groups[0]!.label).toBe("Mini");
    expect(groups[0]!.tariffs.map((t) => t.id)).toEqual(["b", "c"]);
  });

  it("returns an empty array when there are no rows", () => {
    expect(groupTariffsForList([])).toEqual([]);
  });
});
