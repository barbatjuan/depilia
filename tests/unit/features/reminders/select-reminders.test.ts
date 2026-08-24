import { describe, expect, it } from "vitest";
import { selectAppointmentsNeedingReminder } from "@/features/reminders/domain/select-reminders";

// "now" fixed so tomorrow's BA window is 2026-08-25T03:00:00Z .. 2026-08-26T03:00:00Z.
const NOW = new Date("2026-08-24T15:00:00Z");

describe("selectAppointmentsNeedingReminder", () => {
  it("selects a scheduled appointment inside tomorrow's BA window", () => {
    const result = selectAppointmentsNeedingReminder({
      now: NOW,
      appointments: [
        { id: "a1", scheduledAt: "2026-08-25T14:00:00Z", status: "scheduled" },
      ],
      alreadyRemindedIds: new Set(),
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("a1");
  });

  it("excludes appointments outside the 24h-ahead window", () => {
    const result = selectAppointmentsNeedingReminder({
      now: NOW,
      appointments: [
        // Today, not tomorrow.
        { id: "too-soon", scheduledAt: "2026-08-24T18:00:00Z", status: "scheduled" },
        // Two days out, not tomorrow.
        { id: "too-late", scheduledAt: "2026-08-26T18:00:00Z", status: "scheduled" },
      ],
      alreadyRemindedIds: new Set(),
    });

    expect(result).toEqual([]);
  });

  it("excludes appointments that are not status=scheduled", () => {
    const result = selectAppointmentsNeedingReminder({
      now: NOW,
      appointments: [
        { id: "cancelled", scheduledAt: "2026-08-25T14:00:00Z", status: "cancelled" },
        { id: "completed", scheduledAt: "2026-08-25T14:00:00Z", status: "completed" },
        { id: "no_show", scheduledAt: "2026-08-25T14:00:00Z", status: "no_show" },
      ],
      alreadyRemindedIds: new Set(),
    });

    expect(result).toEqual([]);
  });

  it("excludes appointments that already have a reminder logged (idempotency)", () => {
    const result = selectAppointmentsNeedingReminder({
      now: NOW,
      appointments: [
        { id: "a1", scheduledAt: "2026-08-25T14:00:00Z", status: "scheduled" },
        { id: "a2", scheduledAt: "2026-08-25T16:00:00Z", status: "scheduled" },
      ],
      alreadyRemindedIds: new Set(["a1"]),
    });

    expect(result.map((a) => a.id)).toEqual(["a2"]);
  });
});
