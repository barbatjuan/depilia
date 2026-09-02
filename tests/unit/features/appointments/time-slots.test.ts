import { describe, expect, it } from "vitest";
import {
  quarterHourSlots,
  snapToQuarter,
} from "@/features/appointments/domain/time-slots";

describe("quarterHourSlots", () => {
  it("lists every 15-minute slot from start to the last one before end", () => {
    expect(quarterHourSlots(8, 9)).toEqual([
      "08:00",
      "08:15",
      "08:30",
      "08:45",
    ]);
  });

  it("zero-pads hours and covers the full clinic day", () => {
    const slots = quarterHourSlots(8, 20);
    expect(slots[0]).toBe("08:00");
    expect(slots.at(-1)).toBe("19:45");
    expect(slots).toHaveLength(12 * 4);
  });
});

describe("snapToQuarter", () => {
  it("rounds a time to the nearest quarter hour", () => {
    expect(snapToQuarter("13:07")).toBe("13:00");
    expect(snapToQuarter("13:08")).toBe("13:15");
    expect(snapToQuarter("13:53")).toBe("14:00");
  });

  it("passes an exact quarter through unchanged", () => {
    expect(snapToQuarter("09:30")).toBe("09:30");
  });

  it("falls back to a default for an empty or malformed value", () => {
    expect(snapToQuarter("")).toBe("09:00");
    expect(snapToQuarter("nope")).toBe("09:00");
  });
});
