import { describe, expect, it } from "vitest";
import {
  appointmentStatusSchema,
  createAppointmentSchema,
  editAppointmentSchema,
} from "@/features/appointments/schema";

const validBase = {
  clientId: "11111111-1111-1111-1111-111111111111",
  zoneId: "22222222-2222-2222-2222-222222222222",
  scheduledAt: "2026-08-24T12:00:00.000Z",
  durationMinutes: "30",
};

describe("createAppointmentSchema", () => {
  it("accepts a booking with neither package nor loose sale (walk-in, unlinked)", () => {
    const result = createAppointmentSchema.safeParse(validBase);
    expect(result.success).toBe(true);
  });

  it("accepts a booking linked to a client package", () => {
    const result = createAppointmentSchema.safeParse({
      ...validBase,
      clientPackageId: "33333333-3333-3333-3333-333333333333",
    });
    expect(result.success).toBe(true);
  });

  it("accepts a booking linked to a loose sale", () => {
    const result = createAppointmentSchema.safeParse({
      ...validBase,
      looseSaleId: "44444444-4444-4444-4444-444444444444",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a booking linked to both a package and a loose sale", () => {
    const result = createAppointmentSchema.safeParse({
      ...validBase,
      clientPackageId: "33333333-3333-3333-3333-333333333333",
      looseSaleId: "44444444-4444-4444-4444-444444444444",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing client", () => {
    const result = createAppointmentSchema.safeParse({
      ...validBase,
      clientId: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-positive duration", () => {
    const result = createAppointmentSchema.safeParse({
      ...validBase,
      durationMinutes: "0",
    });
    expect(result.success).toBe(false);
  });
});

describe("editAppointmentSchema", () => {
  it("accepts a valid zone, new time and duration", () => {
    const result = editAppointmentSchema.safeParse({
      zoneId: "22222222-2222-2222-2222-222222222222",
      scheduledAt: "2026-08-24T12:00:00.000Z",
      durationMinutes: "45",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing scheduledAt", () => {
    const result = editAppointmentSchema.safeParse({
      zoneId: "22222222-2222-2222-2222-222222222222",
      scheduledAt: "",
      durationMinutes: "30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-uuid zone", () => {
    const result = editAppointmentSchema.safeParse({
      zoneId: "not-a-uuid",
      scheduledAt: "2026-08-24T12:00:00.000Z",
      durationMinutes: "30",
    });
    expect(result.success).toBe(false);
  });
});

describe("appointmentStatusSchema", () => {
  it("accepts each valid status value", () => {
    for (const status of ["completed", "cancelled", "no_show"]) {
      expect(appointmentStatusSchema.safeParse(status).success).toBe(true);
    }
  });

  it("rejects an unknown status value", () => {
    expect(appointmentStatusSchema.safeParse("bogus").success).toBe(false);
  });
});
