import { describe, expect, it } from "vitest";
import {
  recurrenceStatus,
  buildRecurrenceList,
  type ZoneRecurrenceInput,
} from "@/features/clients/domain/zone-recurrence";

const NOW = new Date("2026-06-15T12:00:00Z");
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const weeksAgo = (n: number) =>
  new Date(NOW.getTime() - n * WEEK_MS).toISOString();

function input(overrides: Partial<ZoneRecurrenceInput> = {}): ZoneRecurrenceInput {
  return {
    clientId: "c1",
    clientName: "Ana Díaz",
    phone: "+5491100000000",
    zoneId: "z1",
    zoneName: "Piernas",
    recommendedWeeks: 6,
    remainingSessions: 4,
    lastSessionAt: weeksAgo(10),
    packageCreatedAt: weeksAgo(20),
    hasUpcomingSession: false,
    ...overrides,
  };
}

describe("recurrenceStatus", () => {
  it("returns null while still inside the recommended interval", () => {
    expect(recurrenceStatus(5, 6)).toBeNull();
  });

  it("returns 'due' the week the interval is reached", () => {
    expect(recurrenceStatus(6, 6)).toBe("due");
  });

  it("returns 'due' between one and two intervals", () => {
    expect(recurrenceStatus(9, 6)).toBe("due");
  });

  it("returns 'overdue' at exactly two intervals", () => {
    expect(recurrenceStatus(12, 6)).toBe("overdue");
  });

  it("returns 'overdue' well past two intervals", () => {
    expect(recurrenceStatus(30, 6)).toBe("overdue");
  });
});

describe("buildRecurrenceList", () => {
  it("returns an empty list for no rows", () => {
    expect(buildRecurrenceList([], NOW)).toEqual([]);
  });

  it("excludes packages that already have an upcoming session booked", () => {
    const rows = buildRecurrenceList(
      [input({ lastSessionAt: weeksAgo(20), hasUpcomingSession: true })],
      NOW,
    );
    expect(rows).toEqual([]);
  });

  it("excludes packages still inside their zone interval", () => {
    const rows = buildRecurrenceList(
      [input({ recommendedWeeks: 6, lastSessionAt: weeksAgo(3) })],
      NOW,
    );
    expect(rows).toEqual([]);
  });

  it("counts from the purchase date when no session was ever completed", () => {
    const [row] = buildRecurrenceList(
      [
        input({
          lastSessionAt: null,
          packageCreatedAt: weeksAgo(9),
          recommendedWeeks: 6,
        }),
      ],
      NOW,
    );
    expect(row).toMatchObject({
      lastSessionAt: null,
      since: weeksAgo(9),
      weeksSince: 9,
      weeksOverdue: 3,
      status: "due",
    });
  });

  it("computes the full row for an overdue package", () => {
    const [row] = buildRecurrenceList(
      [
        input({
          clientId: "c9",
          clientName: "Bea Ruiz",
          phone: "+5491155551234",
          zoneId: "z2",
          zoneName: "Axilas",
          recommendedWeeks: 5,
          remainingSessions: 2,
          lastSessionAt: weeksAgo(14),
        }),
      ],
      NOW,
    );
    expect(row).toEqual({
      clientId: "c9",
      clientName: "Bea Ruiz",
      phone: "+5491155551234",
      zoneId: "z2",
      zoneName: "Axilas",
      remainingSessions: 2,
      lastSessionAt: weeksAgo(14),
      since: weeksAgo(14),
      weeksSince: 14,
      weeksOverdue: 9,
      status: "overdue",
    });
  });

  it("sorts by weeks overdue, not raw weeks since, across zones with different intervals", () => {
    const rows = buildRecurrenceList(
      [
        // 8 weeks out on an 8-week zone -> 0 overdue
        input({ clientId: "slow", recommendedWeeks: 8, lastSessionAt: weeksAgo(8) }),
        // 7 weeks out on a 4-week zone -> 3 overdue
        input({ clientId: "fast", recommendedWeeks: 4, lastSessionAt: weeksAgo(7) }),
      ],
      NOW,
    );
    expect(rows.map((r) => r.clientId)).toEqual(["fast", "slow"]);
  });

  it("keeps one row per (client, zone) package input", () => {
    const rows = buildRecurrenceList(
      [
        input({ clientId: "c1", zoneId: "z1", lastSessionAt: weeksAgo(10) }),
        input({ clientId: "c1", zoneId: "z2", lastSessionAt: weeksAgo(12) }),
      ],
      NOW,
    );
    expect(rows).toHaveLength(2);
  });
});
