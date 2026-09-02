import { describe, expect, it } from "vitest";
import { buildBusinessMetrics, deltaPct } from "@/features/accounting/domain/business-metrics";

describe("deltaPct", () => {
  it("computes a percent change", () => {
    expect(deltaPct(150, 100)).toBe(50);
    expect(deltaPct(50, 100)).toBe(-50);
  });

  it("is null when there is nothing to compare against", () => {
    expect(deltaPct(100, 0)).toBeNull();
  });
});

describe("buildBusinessMetrics", () => {
  it("computes cancel/no-show rates as a percent of total appointments", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [
        { status: "completed", zoneName: "Piernas" },
        { status: "completed", zoneName: "Piernas" },
        { status: "cancelled", zoneName: "Axilas" },
        { status: "no_show", zoneName: "Axilas" },
      ],
      sales: [],
      clientsFirstSale: [],
    });
    expect(result.cancelRate).toBe(25);
    expect(result.noShowRate).toBe(25);
  });

  it("returns zero rates and no zones when there were no appointments", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [],
      sales: [],
      clientsFirstSale: [],
    });
    expect(result.cancelRate).toBe(0);
    expect(result.noShowRate).toBe(0);
    expect(result.topZones).toEqual([]);
  });

  it("ranks top zones desc by appointment count, capped at 5", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [
        { status: "completed", zoneName: "Piernas" },
        { status: "completed", zoneName: "Piernas" },
        { status: "completed", zoneName: "Axilas" },
      ],
      sales: [],
      clientsFirstSale: [],
    });
    expect(result.topZones[0]).toEqual({ zoneName: "Piernas", count: 2 });
    expect(result.topZones[1]).toEqual({ zoneName: "Axilas", count: 1 });
  });

  it("classifies a client as new when their all-time first sale is this month", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [],
      sales: [{ clientId: "c1", total: 100, soldAt: "2026-06-05T13:00:00Z" }],
      clientsFirstSale: [{ clientId: "c1", firstSaleAt: "2026-06-05T13:00:00Z" }],
    });
    expect(result.newClients).toBe(1);
    expect(result.returningClients).toBe(0);
  });

  it("classifies a client as returning when their first sale was in an earlier month", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [],
      sales: [{ clientId: "c1", total: 100, soldAt: "2026-06-05T13:00:00Z" }],
      clientsFirstSale: [{ clientId: "c1", firstSaleAt: "2026-01-05T13:00:00Z" }],
    });
    expect(result.newClients).toBe(0);
    expect(result.returningClients).toBe(1);
  });

  it("buckets revenue by clinic-local weekday and hour", () => {
    const result = buildBusinessMetrics({
      monthKey: "2026-06",
      appointments: [],
      sales: [
        // 2026-06-10T14:30:00Z -> BA-local Wed 11:30
        { clientId: "c1", total: 1000, soldAt: "2026-06-10T14:30:00Z" },
        // 2026-06-11T02:30:00Z -> BA-local Wed(prev day) 23:30
        { clientId: "c1", total: 500, soldAt: "2026-06-11T02:30:00Z" },
      ],
      clientsFirstSale: [],
    });
    const wednesday = result.revenueByWeekday.find((w) => w.weekday === "Miércoles")!;
    expect(wednesday.total).toBe(1500);
    expect(result.revenueByHour[11]!.total).toBe(1000);
    expect(result.revenueByHour[23]!.total).toBe(500);
  });
});
