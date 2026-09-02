import { describe, expect, it } from "vitest";
import {
  formatMonthLabel,
  monthKey,
  monthRange,
  nextMonthKey,
  parseMonthParam,
  prevMonthKey,
  recentMonthKeys,
  yearStartKey,
  ytdRange,
} from "@/features/accounting/domain/period";

describe("monthKey", () => {
  it("returns the Buenos Aires calendar month, not the UTC one", () => {
    // 01:30 UTC on Sep 1 is still 22:30 Aug 31 in Buenos Aires (UTC-3)
    expect(monthKey(new Date("2026-09-01T01:30:00Z"))).toBe("2026-08");
    expect(monthKey(new Date("2026-08-15T15:00:00Z"))).toBe("2026-08");
    expect(monthKey(new Date("2026-09-01T05:00:00Z"))).toBe("2026-09");
  });
});

describe("monthRange", () => {
  it("brackets the month with BA-midnight UTC instants and exclusive end", () => {
    expect(monthRange("2026-12")).toEqual({
      startUtc: "2026-12-01T03:00:00.000Z",
      endUtc: "2027-01-01T03:00:00.000Z",
      startDate: "2026-12-01",
      endDate: "2027-01-01",
    });
  });

  it("handles a mid-year month", () => {
    expect(monthRange("2026-02")).toEqual({
      startUtc: "2026-02-01T03:00:00.000Z",
      endUtc: "2026-03-01T03:00:00.000Z",
      startDate: "2026-02-01",
      endDate: "2026-03-01",
    });
  });

  it("keeps a payment made just after UTC-midnight in the correct BA month", () => {
    // 2026-09-01T02:00Z is 2026-08-31 23:00 in Buenos Aires — it belongs to
    // August, not September. This is the bug get-kpis.ts used to have.
    const instant = new Date("2026-09-01T02:00:00Z").toISOString();
    const sep = monthRange("2026-09");
    const aug = monthRange("2026-08");
    expect(instant >= sep.startUtc).toBe(false);
    expect(instant >= aug.startUtc && instant < aug.endUtc).toBe(true);
  });
});

describe("prevMonthKey", () => {
  it("crosses the year boundary", () => {
    expect(prevMonthKey("2026-01")).toBe("2025-12");
    expect(prevMonthKey("2026-09")).toBe("2026-08");
  });
});

describe("nextMonthKey", () => {
  it("crosses the year boundary", () => {
    expect(nextMonthKey("2025-12")).toBe("2026-01");
    expect(nextMonthKey("2026-08")).toBe("2026-09");
  });
});

describe("yearStartKey / ytdRange", () => {
  it("yearStartKey is January of the same year", () => {
    expect(yearStartKey("2026-09")).toBe("2026-01");
  });

  it("ytdRange spans January 1 through the end of the given month", () => {
    expect(ytdRange("2026-03")).toEqual({
      startUtc: "2026-01-01T03:00:00.000Z",
      endUtc: "2026-04-01T03:00:00.000Z",
      startDate: "2026-01-01",
      endDate: "2026-04-01",
    });
  });
});

describe("parseMonthParam", () => {
  const now = new Date("2026-09-15T12:00:00Z");

  it("passes a valid YYYY-MM through", () => {
    expect(parseMonthParam("2026-03", now)).toBe("2026-03");
  });

  it("falls back to the current month for missing / malformed / impossible values", () => {
    expect(parseMonthParam(undefined, now)).toBe("2026-09");
    expect(parseMonthParam("garbage", now)).toBe("2026-09");
    expect(parseMonthParam("2026-13", now)).toBe("2026-09");
    expect(parseMonthParam("2026-00", now)).toBe("2026-09");
  });
});

describe("recentMonthKeys", () => {
  it("lists the last n months, newest first, ending at the current one", () => {
    const now = new Date("2026-01-10T12:00:00Z");
    expect(recentMonthKeys(now, 3)).toEqual(["2026-01", "2025-12", "2025-11"]);
  });
});

describe("formatMonthLabel", () => {
  it("renders a localized 'month year' label", () => {
    const label = formatMonthLabel("2026-09", "es-ES");
    expect(label.toLowerCase()).toContain("septiembre");
    expect(label).toContain("2026");
  });
});
