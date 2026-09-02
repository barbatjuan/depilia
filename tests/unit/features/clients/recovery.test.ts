import { describe, expect, it } from "vitest";
import {
  bucketForLastVisit,
  buildRecoveryList,
} from "@/features/clients/domain/recovery";

const NOW = new Date("2026-06-15T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY_MS).toISOString();

describe("bucketForLastVisit", () => {
  it("returns null when the client never visited", () => {
    expect(bucketForLastVisit(null, NOW)).toBeNull();
  });

  it("buckets exactly 45 days as green", () => {
    expect(bucketForLastVisit(daysAgo(45), NOW)).toBe("green");
  });

  it("buckets 46 days as yellow", () => {
    expect(bucketForLastVisit(daysAgo(46), NOW)).toBe("yellow");
  });

  it("buckets exactly 90 days as yellow", () => {
    expect(bucketForLastVisit(daysAgo(90), NOW)).toBe("yellow");
  });

  it("buckets 91 days as red", () => {
    expect(bucketForLastVisit(daysAgo(91), NOW)).toBe("red");
  });

  it("buckets a visit today as green", () => {
    expect(bucketForLastVisit(daysAgo(0), NOW)).toBe("green");
  });
});

describe("buildRecoveryList", () => {
  it("excludes clients with no visit on record", () => {
    const result = buildRecoveryList(
      [{ clientId: "1", name: "Sin visita", phone: null, lastVisit: null }],
      NOW,
    );
    expect(result).toEqual([]);
  });

  it("returns an empty list for no rows", () => {
    expect(buildRecoveryList([], NOW)).toEqual([]);
  });

  it("computes daysSince and bucket per row", () => {
    const [row] = buildRecoveryList(
      [{ clientId: "1", name: "Ana", phone: "+5491100000000", lastVisit: daysAgo(100) }],
      NOW,
    );
    expect(row).toEqual({
      clientId: "1",
      name: "Ana",
      phone: "+5491100000000",
      lastVisit: daysAgo(100),
      daysSince: 100,
      bucket: "red",
    });
  });

  it("sorts most-overdue first", () => {
    const result = buildRecoveryList(
      [
        { clientId: "1", name: "Reciente", phone: null, lastVisit: daysAgo(10) },
        { clientId: "2", name: "Muy atrasada", phone: null, lastVisit: daysAgo(200) },
        { clientId: "3", name: "Media", phone: null, lastVisit: daysAgo(60) },
      ],
      NOW,
    );
    expect(result.map((r) => r.clientId)).toEqual(["2", "3", "1"]);
  });
});
