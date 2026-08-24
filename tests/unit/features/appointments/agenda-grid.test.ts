import { describe, expect, it } from "vitest";
import {
  groupAppointmentsByHour,
  groupAppointmentsByWeekday,
} from "@/features/appointments/domain/agenda-grid";

type Appt = { id: string; scheduledAt: string };

describe("groupAppointmentsByHour", () => {
  const dayStart = new Date("2026-08-24T03:00:00.000Z"); // 2026-08-24 00:00 BA

  it("buckets each appointment into its BA local hour slot", () => {
    const appointments: Appt[] = [
      { id: "a", scheduledAt: "2026-08-24T12:30:00Z" }, // 09:30 BA
      { id: "b", scheduledAt: "2026-08-24T12:45:00Z" }, // 09:45 BA, same hour as a
      { id: "c", scheduledAt: "2026-08-24T15:00:00Z" }, // 12:00 BA
    ];

    const grouped = groupAppointmentsByHour(appointments, dayStart, 8, 20);

    expect(grouped.get(9)?.map((a) => a.id)).toEqual(["a", "b"]);
    expect(grouped.get(12)?.map((a) => a.id)).toEqual(["c"]);
  });

  it("omits appointments scheduled outside the configured hour range", () => {
    const appointments: Appt[] = [
      { id: "early", scheduledAt: "2026-08-24T09:00:00Z" }, // 06:00 BA
      { id: "late", scheduledAt: "2026-08-25T00:30:00Z" }, // 21:30 BA
    ];

    const grouped = groupAppointmentsByHour(appointments, dayStart, 8, 20);

    expect(Array.from(grouped.values()).flat()).toHaveLength(0);
  });

  it("returns an empty map for an empty appointment list", () => {
    const grouped = groupAppointmentsByHour([], dayStart, 8, 20);
    expect(grouped.size).toBe(0);
  });

  it("orders appointments within the same hour bucket by time", () => {
    const appointments: Appt[] = [
      { id: "later", scheduledAt: "2026-08-24T12:45:00Z" },
      { id: "earlier", scheduledAt: "2026-08-24T12:15:00Z" },
    ];

    const grouped = groupAppointmentsByHour(appointments, dayStart, 8, 20);

    expect(grouped.get(9)?.map((a) => a.id)).toEqual(["earlier", "later"]);
  });
});

describe("groupAppointmentsByWeekday", () => {
  const weekStart = new Date("2026-08-24T03:00:00.000Z"); // Monday 00:00 BA

  it("groups appointments into their BA weekday column (index 0 = Monday)", () => {
    const appointments: Appt[] = [
      { id: "mon1", scheduledAt: "2026-08-24T15:00:00Z" },
      { id: "mon2", scheduledAt: "2026-08-24T18:00:00Z" },
      { id: "wed", scheduledAt: "2026-08-26T15:00:00Z" },
    ];

    const grouped = groupAppointmentsByWeekday(appointments, weekStart);

    expect(grouped[0]?.map((a) => a.id)).toEqual(["mon1", "mon2"]);
    expect(grouped[2]?.map((a) => a.id)).toEqual(["wed"]);
    expect(grouped[6]).toEqual([]);
  });

  it("returns 7 empty arrays for an empty appointment list", () => {
    const grouped = groupAppointmentsByWeekday([], weekStart);
    expect(grouped).toHaveLength(7);
    expect(grouped.every((day) => day.length === 0)).toBe(true);
  });
});
