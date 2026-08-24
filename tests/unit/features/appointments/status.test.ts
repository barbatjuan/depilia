import { describe, expect, it } from "vitest";
import {
  canTransitionAppointmentStatus,
  describeStatusTransitionError,
  STATUS_LABEL,
} from "@/features/appointments/domain/status";

describe("canTransitionAppointmentStatus", () => {
  it("allows scheduled -> completed (spec: mark appointment complete)", () => {
    expect(canTransitionAppointmentStatus("scheduled", "completed")).toBe(
      true,
    );
  });

  it("allows scheduled -> cancelled (spec: cancel a scheduled appointment)", () => {
    expect(canTransitionAppointmentStatus("scheduled", "cancelled")).toBe(
      true,
    );
  });

  it("allows scheduled -> no_show", () => {
    expect(canTransitionAppointmentStatus("scheduled", "no_show")).toBe(true);
  });

  it("allows completed -> cancelled (spec: cancel-after-completion restores the session)", () => {
    expect(canTransitionAppointmentStatus("completed", "cancelled")).toBe(
      true,
    );
  });

  it("rejects completed -> no_show", () => {
    expect(canTransitionAppointmentStatus("completed", "no_show")).toBe(
      false,
    );
  });

  it("rejects completed -> completed (no-op repeat, not a UI-driven transition)", () => {
    expect(canTransitionAppointmentStatus("completed", "completed")).toBe(
      false,
    );
  });

  it("rejects any transition out of a terminal cancelled status", () => {
    expect(canTransitionAppointmentStatus("cancelled", "scheduled")).toBe(
      false,
    );
    expect(canTransitionAppointmentStatus("cancelled", "completed")).toBe(
      false,
    );
  });

  it("rejects any transition out of a terminal no_show status", () => {
    expect(canTransitionAppointmentStatus("no_show", "scheduled")).toBe(
      false,
    );
    expect(canTransitionAppointmentStatus("no_show", "completed")).toBe(
      false,
    );
  });
});

describe("describeStatusTransitionError", () => {
  it("returns null for an allowed transition", () => {
    expect(describeStatusTransitionError("scheduled", "completed")).toBeNull();
  });

  it("returns a friendly Spanish message for a disallowed transition", () => {
    expect(describeStatusTransitionError("cancelled", "completed")).toBe(
      "No se puede pasar de cancelado a completado.",
    );
  });
});

describe("STATUS_LABEL", () => {
  it("has a Spanish label for every appointment status", () => {
    expect(STATUS_LABEL.scheduled).toBe("Programado");
    expect(STATUS_LABEL.completed).toBe("Completado");
    expect(STATUS_LABEL.cancelled).toBe("Cancelado");
    expect(STATUS_LABEL.no_show).toBe("Ausente");
  });
});
