import { describe, expect, it } from "vitest";
import { mapPaymentError } from "@/features/sales/domain/payment-errors";

describe("mapPaymentError", () => {
  it("maps the overpayment trigger's exception into a friendly Spanish message", () => {
    const message = mapPaymentError({
      message:
        "payment_exceeds_balance: payment 40000.00 would exceed remaining balance on sale abc-123",
    });

    expect(message).toBe(
      "Ese pago supera el saldo pendiente de la venta. Revisá el monto e intentá de nuevo.",
    );
  });

  it("falls back to a generic message for an unrecognized error", () => {
    const message = mapPaymentError({ message: "some other db error" });

    expect(message).toBe("No se pudo registrar el pago. Intentá de nuevo.");
  });

  it("falls back to a generic message when the error has no message at all", () => {
    const message = mapPaymentError({});

    expect(message).toBe("No se pudo registrar el pago. Intentá de nuevo.");
  });
});
