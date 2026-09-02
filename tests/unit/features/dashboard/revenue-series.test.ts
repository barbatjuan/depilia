import { describe, expect, it } from "vitest";
import { buildRevenueSeries } from "@/features/dashboard/domain/revenue-series";

// now = 2026-09-10 14:00 UTC → clinic-local (UTC-3) date 2026-09-10
const NOW = new Date("2026-09-10T14:00:00Z");

describe("buildRevenueSeries", () => {
  it("returns one zero-filled point per day, oldest first, ending today", () => {
    const series = buildRevenueSeries({ payments: [], days: 7, now: NOW });

    expect(series).toHaveLength(7);
    expect(series[0]?.date).toBe("2026-09-04");
    expect(series.at(-1)?.date).toBe("2026-09-10");
    expect(series.every((p) => p.total === 0)).toBe(true);
  });

  it("sums payment amounts into their clinic-local day bucket", () => {
    const series = buildRevenueSeries({
      payments: [
        { amount: 100, paidAt: "2026-09-09T12:00:00Z" },
        { amount: 50, paidAt: "2026-09-09T20:00:00Z" },
        { amount: 30, paidAt: "2026-09-10T02:00:00Z" }, // 2026-09-09 23:00 in Buenos Aires
      ],
      days: 7,
      now: NOW,
    });

    expect(series.find((p) => p.date === "2026-09-09")?.total).toBe(180);
    expect(series.find((p) => p.date === "2026-09-10")?.total).toBe(0);
  });

  it("ignores payments outside the window", () => {
    const series = buildRevenueSeries({
      payments: [{ amount: 999, paidAt: "2026-08-01T12:00:00Z" }],
      days: 7,
      now: NOW,
    });

    expect(series.reduce((sum, p) => sum + p.total, 0)).toBe(0);
  });

  it("coerces string amounts (numeric columns) to numbers", () => {
    const series = buildRevenueSeries({
      payments: [{ amount: "42.50", paidAt: "2026-09-08T12:00:00Z" }],
      days: 7,
      now: NOW,
    });

    expect(series.find((p) => p.date === "2026-09-08")?.total).toBe(42.5);
  });
});
