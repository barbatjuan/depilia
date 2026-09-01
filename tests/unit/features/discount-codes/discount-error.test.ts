import { describe, expect, it } from "vitest";
import {
  mapDiscountError,
  discountCodeReasonMessage,
} from "@/features/promotions/domain/discount-errors";

describe("mapDiscountError — discount-code trigger messages", () => {
  it("maps the inactive-code trigger RAISE to Spanish", () => {
    const msg = mapDiscountError({
      code: "23514",
      message: "discount_code_inactive: VERANO",
    });
    expect(msg).toBe("El código de descuento ya no está activo.");
  });

  it("maps the out-of-window trigger RAISE to Spanish", () => {
    const msg = mapDiscountError({
      code: "23514",
      message: "discount_code_out_of_window: VERANO",
    });
    expect(msg).toBe("El código de descuento está fuera de vigencia.");
  });

  it("maps the exhausted trigger RAISE to Spanish", () => {
    const msg = mapDiscountError({
      code: "23514",
      message: "discount_code_exhausted: VERANO",
    });
    expect(msg).toBe("El código de descuento ya alcanzó su límite de usos.");
  });

  it("still maps a plain money-identity 23514 to the generic discount message", () => {
    const msg = mapDiscountError({
      code: "23514",
      message: 'new row violates check constraint "sales_money_identity"',
    });
    expect(msg).toBe(
      "El descuento no es válido: la venta no puede quedar en cero o negativa.",
    );
  });
});

describe("discountCodeReasonMessage", () => {
  it.each([
    ["unknown", "El código de descuento no existe."],
    ["inactive", "El código de descuento ya no está activo."],
    ["out_of_window", "El código de descuento está fuera de vigencia."],
    ["exhausted", "El código de descuento ya alcanzó su límite de usos."],
  ] as const)("maps %s to Spanish", (reason, expected) => {
    expect(discountCodeReasonMessage(reason)).toBe(expected);
  });
});
