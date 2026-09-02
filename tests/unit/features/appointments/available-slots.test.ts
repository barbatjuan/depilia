import { describe, expect, it } from "vitest";
import { availableSlots } from "@/features/appointments/domain/available-slots";

const GRID = ["08:45", "09:00", "09:15", "09:30", "09:45", "10:00", "10:15"];

function existing(overrides: {
  id?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  status?: string;
}) {
  return {
    id: overrides.id ?? "appt-1",
    scheduledAt: overrides.scheduledAt ?? "2026-09-05T12:00:00Z", // 09:00 BA
    durationMinutes: overrides.durationMinutes ?? 60,
    status: overrides.status ?? "scheduled",
  };
}

describe("availableSlots", () => {
  it("hides slots that partially overlap an existing scheduled turno", () => {
    const result = availableSlots(GRID, [existing({})], { durationMinutes: 15 });
    expect(result).toEqual(["08:45", "10:00", "10:15"]);
  });

  it("does not block the slot exactly at the end of an existing turno", () => {
    const result = availableSlots(GRID, [existing({})], { durationMinutes: 15 });
    expect(result).toContain("10:00");
  });

  it("does not block a slot that ends exactly when the existing turno starts", () => {
    const result = availableSlots(GRID, [existing({})], { durationMinutes: 15 });
    expect(result).toContain("08:45");
  });

  it("blocks a slot whose own duration would reach into an existing turno", () => {
    // 08:45 + 60min = 09:45, which overlaps the 09:00-10:00 existing turno.
    const result = availableSlots(GRID, [existing({})], { durationMinutes: 60 });
    expect(result).not.toContain("08:45");
    expect(result).toEqual(["10:00", "10:15"]);
  });

  it("excludes the given appointment id from the conflict check", () => {
    const result = availableSlots(GRID, [existing({ id: "self" })], {
      durationMinutes: 15,
      excludeAppointmentId: "self",
    });
    expect(result).toEqual(GRID);
  });

  it("ignores cancelled, completed and no_show turnos", () => {
    const appts = [
      existing({ id: "a", status: "cancelled" }),
      existing({ id: "b", status: "completed" }),
      existing({ id: "c", status: "no_show" }),
    ];
    const result = availableSlots(GRID, appts, { durationMinutes: 15 });
    expect(result).toEqual(GRID);
  });

  it("returns every slot when there are no existing turnos", () => {
    expect(availableSlots(GRID, [], { durationMinutes: 30 })).toEqual(GRID);
  });
});
