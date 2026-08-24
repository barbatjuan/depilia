import { describe, expect, it } from "vitest";
import { mapAppointmentError } from "@/features/appointments/domain/appointment-errors";

describe("mapAppointmentError", () => {
  it("maps a Postgres exclusion-constraint violation (23P01) to a friendly overlap message", () => {
    const message = mapAppointmentError({
      code: "23P01",
      message: 'conflicting key value violates exclusion constraint "appointments_scheduled_at_..."',
    });

    expect(message).toBe(
      "Ese horario se superpone con otro turno ya agendado. Elegí otro horario.",
    );
  });

  it("maps a package_exhausted trigger error to a friendly message", () => {
    const message = mapAppointmentError({
      code: "23514",
      message: "package_exhausted: no remaining sessions on package abc-123",
    });

    expect(message).toBe(
      "Este paquete no tiene sesiones disponibles.",
    );
  });

  it("maps an appointment_not_found RPC error to a friendly message", () => {
    const message = mapAppointmentError({
      code: "P0001",
      message: "appointment_not_found: abc-123",
    });

    expect(message).toBe("El turno no existe o fue eliminado.");
  });

  it("falls back to a generic Spanish message for unknown errors, never leaking raw Postgres text", () => {
    const message = mapAppointmentError({
      code: "42501",
      message: "permission denied for table appointments",
    });

    expect(message).toBe("No se pudo guardar el turno. Intentá de nuevo.");
  });

  it("falls back to the generic message when error has no code or message", () => {
    expect(mapAppointmentError({})).toBe(
      "No se pudo guardar el turno. Intentá de nuevo.",
    );
  });
});
