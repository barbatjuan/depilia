import { describe, expect, it } from "vitest";
import {
  formatAgendaDateParam,
  parseAgendaDate,
  shiftAgendaDate,
} from "@/features/appointments/domain/agenda-nav";

describe("parseAgendaDate", () => {
  it("parses a valid yyyy-MM-dd param into the BA midday instant of that date", () => {
    const date = parseAgendaDate("2026-08-24");
    expect(formatAgendaDateParam(date)).toBe("2026-08-24");
  });

  it("falls back to today when the param is undefined", () => {
    const now = new Date("2026-08-24T15:00:00Z");
    const date = parseAgendaDate(undefined, now);
    expect(formatAgendaDateParam(date)).toBe("2026-08-24");
  });

  it("falls back to today when the param is malformed", () => {
    const now = new Date("2026-08-24T15:00:00Z");
    const date = parseAgendaDate("not-a-date", now);
    expect(formatAgendaDateParam(date)).toBe("2026-08-24");
  });
});

describe("shiftAgendaDate", () => {
  it("moves the day view forward by exactly one BA calendar day", () => {
    const base = parseAgendaDate("2026-08-24");
    const next = shiftAgendaDate(base, "day", 1);
    expect(formatAgendaDateParam(next)).toBe("2026-08-25");
  });

  it("moves the day view backward by exactly one BA calendar day", () => {
    const base = parseAgendaDate("2026-08-24");
    const prev = shiftAgendaDate(base, "day", -1);
    expect(formatAgendaDateParam(prev)).toBe("2026-08-23");
  });

  it("moves the week view forward by exactly 7 BA calendar days", () => {
    const base = parseAgendaDate("2026-08-24");
    const next = shiftAgendaDate(base, "week", 1);
    expect(formatAgendaDateParam(next)).toBe("2026-08-31");
  });

  it("moves the week view backward by exactly 7 BA calendar days", () => {
    const base = parseAgendaDate("2026-08-24");
    const prev = shiftAgendaDate(base, "week", -1);
    expect(formatAgendaDateParam(prev)).toBe("2026-08-17");
  });
});

describe("formatAgendaDateParam", () => {
  it("formats a UTC instant just after midnight in BA as the previous BA calendar day", () => {
    // 2026-08-24T02:00:00Z = 2026-08-23T23:00 BA — still Aug 23 locally.
    const date = new Date("2026-08-24T02:00:00Z");
    expect(formatAgendaDateParam(date)).toBe("2026-08-23");
  });
});
