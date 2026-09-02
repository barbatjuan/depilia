import { describe, expect, it } from "vitest";
import { toRecurrenceInput } from "@/features/clients/data/zone-recurrence";

const NOW = new Date("2026-06-15T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAway = (n: number) =>
  new Date(NOW.getTime() + n * DAY_MS).toISOString();

type Row = Parameters<typeof toRecurrenceInput>[0];

function row(overrides: Partial<Row> = {}): Row {
  return {
    client_id: "c1",
    zone_id: "z1",
    total_sessions: 6,
    sessions_used: 2,
    created_at: daysAway(-140),
    clients: {
      first_name: "Ana",
      last_name: "Díaz",
      phone: "+5491100000000",
      archived_at: null,
    },
    body_zones: { name: "Piernas", recommended_weeks: 6 },
    appointments: [],
    ...overrides,
  };
}

describe("toRecurrenceInput", () => {
  it("maps an active package to a domain input", () => {
    expect(toRecurrenceInput(row(), NOW)).toEqual({
      clientId: "c1",
      clientName: "Ana Díaz",
      phone: "+5491100000000",
      zoneId: "z1",
      zoneName: "Piernas",
      recommendedWeeks: 6,
      remainingSessions: 4,
      lastSessionAt: null,
      packageCreatedAt: daysAway(-140),
      hasUpcomingSession: false,
    });
  });

  it("drops an exhausted package", () => {
    expect(
      toRecurrenceInput(row({ total_sessions: 6, sessions_used: 6 }), NOW),
    ).toBeNull();
  });

  it("drops a package whose client is archived", () => {
    expect(
      toRecurrenceInput(
        row({
          clients: {
            first_name: "Ana",
            last_name: "Díaz",
            phone: null,
            archived_at: daysAway(-3),
          },
        }),
        NOW,
      ),
    ).toBeNull();
  });

  it("takes the most recent completed appointment as the last session", () => {
    const result = toRecurrenceInput(
      row({
        appointments: [
          { scheduled_at: daysAway(-90), status: "completed" },
          { scheduled_at: daysAway(-30), status: "completed" },
          { scheduled_at: daysAway(-200), status: "cancelled" },
        ],
      }),
      NOW,
    );
    expect(result?.lastSessionAt).toBe(daysAway(-30));
  });

  it("flags a future scheduled appointment as an upcoming session", () => {
    const result = toRecurrenceInput(
      row({
        appointments: [{ scheduled_at: daysAway(5), status: "scheduled" }],
      }),
      NOW,
    );
    expect(result?.hasUpcomingSession).toBe(true);
  });

  it("does not treat a past scheduled appointment as upcoming", () => {
    const result = toRecurrenceInput(
      row({
        appointments: [{ scheduled_at: daysAway(-5), status: "scheduled" }],
      }),
      NOW,
    );
    expect(result?.hasUpcomingSession).toBe(false);
  });
});
