import { describe, expect, it } from "vitest";
import {
  bucketAppointmentsByWeekday,
  getClinicDayBounds,
  getClinicWeekBounds,
} from "@/features/dashboard/domain/schedule";

describe("getClinicDayBounds", () => {
  it("returns the Buenos Aires calendar day for a UTC time well inside that day", () => {
    // 2026-08-24T15:00:00Z = 2026-08-24T12:00:00 in America/Argentina/Buenos_Aires (UTC-3)
    const bounds = getClinicDayBounds(new Date("2026-08-24T15:00:00Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-24T03:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-25T03:00:00.000Z");
  });

  it("rolls back to the previous BA calendar day for a UTC time just after UTC midnight", () => {
    // 2026-08-24T02:00:00Z = 2026-08-23T23:00:00 in Buenos Aires — still Aug 23 locally,
    // the classic tz bug: naive UTC-date math would wrongly report Aug 24.
    const bounds = getClinicDayBounds(new Date("2026-08-24T02:00:00Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-23T03:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-24T03:00:00.000Z");
  });
});

describe("getClinicWeekBounds", () => {
  it("starts the week on Monday 00:00 BA for a mid-week date", () => {
    // 2026-08-26 is a Wednesday.
    const bounds = getClinicWeekBounds(new Date("2026-08-26T18:00:00Z"));

    // Monday 2026-08-24 00:00 BA == 2026-08-24T03:00:00Z
    expect(bounds.start.toISOString()).toBe("2026-08-24T03:00:00.000Z");
    // Next Monday 2026-08-31 00:00 BA == 2026-08-31T03:00:00Z
    expect(bounds.end.toISOString()).toBe("2026-08-31T03:00:00.000Z");
  });

  it("keeps a Sunday in the week that started the preceding Monday, not the next one", () => {
    // 2026-08-30 is a Sunday, in the same week as the Wednesday above.
    const bounds = getClinicWeekBounds(new Date("2026-08-30T18:00:00Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-24T03:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-31T03:00:00.000Z");
  });
});

describe("bucketAppointmentsByWeekday", () => {
  const weekStart = new Date("2026-08-24T03:00:00.000Z"); // Monday 00:00 BA

  it("counts appointments into their BA weekday slot (index 0 = Monday)", () => {
    const counts = bucketAppointmentsByWeekday(
      [
        { scheduledAt: "2026-08-24T15:00:00Z" }, // Monday
        { scheduledAt: "2026-08-24T18:00:00Z" }, // Monday
        { scheduledAt: "2026-08-26T15:00:00Z" }, // Wednesday
      ],
      weekStart,
    );

    expect(counts).toEqual([2, 0, 1, 0, 0, 0, 0]);
  });

  it("returns all zeros for an empty appointment list", () => {
    const counts = bucketAppointmentsByWeekday([], weekStart);

    expect(counts).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
