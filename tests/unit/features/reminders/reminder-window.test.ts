import { describe, expect, it } from "vitest";
import {
  getReminderSendDate,
  getReminderWindowBounds,
} from "@/features/reminders/domain/reminder-window";

describe("getReminderWindowBounds", () => {
  it("returns tomorrow's Buenos Aires calendar day for a UTC time well inside today", () => {
    // 2026-08-24T15:00:00Z = 2026-08-24T12:00:00 in America/Argentina/Buenos_Aires (UTC-3)
    // Tomorrow BA (Aug 25) starts at 2026-08-25T03:00:00Z.
    const bounds = getReminderWindowBounds(new Date("2026-08-24T15:00:00Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-25T03:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-26T03:00:00.000Z");
  });

  it("rolls the tomorrow window back a day for a UTC time just after UTC midnight", () => {
    // 2026-08-24T02:00:00Z = 2026-08-23T23:00:00 in Buenos Aires — still Aug 23 locally,
    // so "tomorrow" is Aug 24, not Aug 25 (naive UTC-date math would get this wrong).
    const bounds = getReminderWindowBounds(new Date("2026-08-24T02:00:00Z"));

    expect(bounds.start.toISOString()).toBe("2026-08-24T03:00:00.000Z");
    expect(bounds.end.toISOString()).toBe("2026-08-25T03:00:00.000Z");
  });
});

describe("getReminderSendDate", () => {
  it("returns tomorrow's BA calendar date as yyyy-MM-dd", () => {
    expect(getReminderSendDate(new Date("2026-08-24T15:00:00Z"))).toBe("2026-08-25");
  });

  it("wraps across a month boundary", () => {
    // 2026-08-31T15:00:00Z = 2026-08-31T12:00:00 BA -> tomorrow is Sep 1.
    expect(getReminderSendDate(new Date("2026-08-31T15:00:00Z"))).toBe("2026-09-01");
  });
});
