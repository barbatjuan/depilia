import { describe, expect, it } from "vitest";
import {
  currentMonthRange,
  currentMonthTotal,
} from "@/features/expenses/domain/month-total";

describe("currentMonthRange", () => {
  it("returns the calendar month bounds in Buenos Aires time for a midday UTC date", () => {
    const range = currentMonthRange(new Date("2026-08-15T15:00:00Z"));

    expect(range).toEqual({ start: "2026-08-01", end: "2026-09-01" });
  });

  it("does not roll over to the next BA month for a late-UTC timestamp still in the prior BA day", () => {
    // 2026-09-01T01:30:00Z is 2026-08-31T22:30:00-03:00 in Buenos Aires —
    // still August there, even though it's already September in UTC.
    const range = currentMonthRange(new Date("2026-09-01T01:30:00Z"));

    expect(range).toEqual({ start: "2026-08-01", end: "2026-09-01" });
  });

  it("wraps December into January of the following year", () => {
    const range = currentMonthRange(new Date("2026-12-20T12:00:00Z"));

    expect(range).toEqual({ start: "2026-12-01", end: "2027-01-01" });
  });
});

describe("currentMonthTotal", () => {
  const now = new Date("2026-08-15T15:00:00Z");

  it("sums only expenses whose spent_on date falls within the current BA month", () => {
    const total = currentMonthTotal(
      [
        { amount: 10000, spentOn: "2026-08-01" },
        { amount: 5000, spentOn: "2026-08-31" },
        { amount: 9999, spentOn: "2026-07-31" },
        { amount: 8888, spentOn: "2026-09-01" },
      ],
      now,
    );

    expect(total).toBe(15000);
  });

  it("returns 0 for an empty list", () => {
    expect(currentMonthTotal([], now)).toBe(0);
  });
});
