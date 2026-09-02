import { describe, expect, it } from "vitest";
import {
  buildClientTimeline,
  summarizeClientHistory,
} from "@/features/clients/domain/client-history";

const NOW = new Date("2026-06-15T12:00:00Z");

describe("summarizeClientHistory", () => {
  it("returns all zeros/null for a client with no history", () => {
    const result = summarizeClientHistory({
      appointments: [],
      sales: [],
      payments: [],
      packages: [],
      now: NOW,
    });
    expect(result).toEqual({
      lastVisit: null,
      nextVisit: null,
      totalSpent: 0,
      visitCount: 0,
      averageTicket: 0,
      cancelledCount: 0,
      noShowCount: 0,
      favouriteZones: [],
      activePackages: 0,
      lifetimeMonths: 0,
    });
  });

  it("computes lastVisit/nextVisit from past vs future appointments", () => {
    const result = summarizeClientHistory({
      appointments: [
        { status: "completed", scheduledAt: "2026-06-01T12:00:00Z", zoneName: "Piernas" },
        { status: "scheduled", scheduledAt: "2026-06-20T12:00:00Z", zoneName: "Piernas" },
      ],
      sales: [],
      payments: [],
      packages: [],
      now: NOW,
    });
    expect(result.lastVisit).toBe("2026-06-01T12:00:00Z");
    expect(result.nextVisit).toBe("2026-06-20T12:00:00Z");
  });

  it("counts visits and average ticket only from completed appointments/payments", () => {
    const result = summarizeClientHistory({
      appointments: [
        { status: "completed", scheduledAt: "2026-06-01T12:00:00Z", zoneName: "Piernas" },
        { status: "completed", scheduledAt: "2026-06-08T12:00:00Z", zoneName: "Piernas" },
        { status: "cancelled", scheduledAt: "2026-06-10T12:00:00Z", zoneName: "Piernas" },
      ],
      sales: [],
      payments: [{ amount: 100, paidAt: "2026-06-01T12:00:00Z" }, { amount: 200, paidAt: "2026-06-08T12:00:00Z" }],
      packages: [],
      now: NOW,
    });
    expect(result.visitCount).toBe(2);
    expect(result.totalSpent).toBe(300);
    expect(result.averageTicket).toBe(150);
    expect(result.cancelledCount).toBe(1);
  });

  it("ranks favourite zones desc, capped at 3", () => {
    const result = summarizeClientHistory({
      appointments: [
        { status: "completed", scheduledAt: "2026-06-01T12:00:00Z", zoneName: "Piernas" },
        { status: "completed", scheduledAt: "2026-06-02T12:00:00Z", zoneName: "Piernas" },
        { status: "completed", scheduledAt: "2026-06-03T12:00:00Z", zoneName: "Axilas" },
      ],
      sales: [],
      payments: [],
      packages: [],
      now: NOW,
    });
    expect(result.favouriteZones[0]).toEqual({ zone: "Piernas", count: 2 });
  });

  it("counts only packages with sessions remaining as active", () => {
    const result = summarizeClientHistory({
      appointments: [],
      sales: [],
      payments: [],
      packages: [{ remaining: 3 }, { remaining: 0 }],
      now: NOW,
    });
    expect(result.activePackages).toBe(1);
  });
});

describe("buildClientTimeline", () => {
  it("merges sales, payments and appointments sorted chronologically desc", () => {
    const timeline = buildClientTimeline({
      sales: [{ description: "Bono piernas", total: 1000, soldAt: "2026-06-01T12:00:00Z" }],
      payments: [{ amount: 500, paidAt: "2026-06-03T12:00:00Z", method: "cash" }],
      appointments: [{ zoneName: "Piernas", scheduledAt: "2026-06-02T12:00:00Z", status: "completed" }],
    });
    expect(timeline.map((e) => e.type)).toEqual(["payment", "appointment", "sale"]);
  });

  it("empty input yields an empty timeline", () => {
    expect(buildClientTimeline({ sales: [], payments: [], appointments: [] })).toEqual([]);
  });
});
