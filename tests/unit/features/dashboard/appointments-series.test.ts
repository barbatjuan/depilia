import { describe, expect, it } from "vitest";
import { buildAppointmentsSeries } from "@/features/dashboard/domain/appointments-series";

const NOW = new Date("2026-09-10T14:00:00Z"); // clinic-local 2026-09-10

describe("buildAppointmentsSeries", () => {
  it("returns one zero-filled point per day, oldest first, ending today", () => {
    const series = buildAppointmentsSeries({
      appointments: [],
      days: 14,
      now: NOW,
    });

    expect(series).toHaveLength(14);
    expect(series[0]?.date).toBe("2026-08-28");
    expect(series.at(-1)?.date).toBe("2026-09-10");
    expect(series.every((p) => p.count === 0)).toBe(true);
  });

  it("counts appointments into their clinic-local day bucket", () => {
    const series = buildAppointmentsSeries({
      appointments: [
        { scheduledAt: "2026-09-09T13:00:00Z" },
        { scheduledAt: "2026-09-09T16:00:00Z" },
        { scheduledAt: "2026-09-10T11:00:00Z" },
      ],
      days: 14,
      now: NOW,
    });

    expect(series.find((p) => p.date === "2026-09-09")?.count).toBe(2);
    expect(series.find((p) => p.date === "2026-09-10")?.count).toBe(1);
  });

  it("ignores appointments outside the window", () => {
    const series = buildAppointmentsSeries({
      appointments: [{ scheduledAt: "2026-07-01T12:00:00Z" }],
      days: 14,
      now: NOW,
    });

    expect(series.reduce((sum, p) => sum + p.count, 0)).toBe(0);
  });
});
