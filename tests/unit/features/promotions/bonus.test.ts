import { describe, expect, it } from "vitest";
import { bonusPrice, bonusSessions } from "@/features/promotions/domain/discount";

describe("bonus promotion math", () => {
  it("adds the bonus sessions to the tariff default (6+2 => 8)", () => {
    expect(bonusSessions(6, 2)).toBe(8);
  });

  it("keeps the default when there is no bonus", () => {
    expect(bonusSessions(6, 0)).toBe(6);
  });

  it("uses the override price when the promotion item sets one", () => {
    expect(bonusPrice(60000, 50000)).toBe(50000);
  });

  it("falls back to the tariff bono price when there is no override", () => {
    expect(bonusPrice(60000, null)).toBe(60000);
  });
});
