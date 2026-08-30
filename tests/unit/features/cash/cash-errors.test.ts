import { describe, expect, it } from "vitest";
import { mapCashError } from "@/features/cash/domain/cash-errors";

describe("mapCashError", () => {
  it("maps a duplicate business_date (23505) to a Spanish 'ya existe una caja' message", () => {
    const message = mapCashError({
      code: "23505",
      message:
        'duplicate key value violates unique constraint "cash_sessions_business_date_key"',
    });
    expect(message).toBe("Ya existe una caja para hoy.");
  });

  it("maps the cash_session_not_open trigger exception to Spanish", () => {
    const message = mapCashError({
      message: "cash_session_not_open: session abc is not open",
    });
    expect(message).toBe("La caja de esa fecha no está abierta.");
  });

  it("maps the cash_session_already_closed trigger exception to Spanish", () => {
    const message = mapCashError({
      message: "cash_session_already_closed: session abc is closed",
    });
    expect(message).toBe("La caja ya fue cerrada y no puede modificarse.");
  });

  it("maps the cash_session_count_required trigger exception to Spanish", () => {
    const message = mapCashError({
      message: "cash_session_count_required: counted_amount is required to close",
    });
    expect(message).toBe("Ingresá el monto contado para poder cerrar la caja.");
  });

  it("falls back to a generic Spanish message for an unknown error", () => {
    expect(mapCashError({ message: "some other db error" })).toBe(
      "No se pudo completar la operación de caja. Intentá de nuevo.",
    );
    expect(mapCashError({})).toBe(
      "No se pudo completar la operación de caja. Intentá de nuevo.",
    );
  });
});
