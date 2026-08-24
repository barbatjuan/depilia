import { describe, expect, it } from "vitest";
import { clientSchema } from "@/features/clients/schema";

describe("clientSchema", () => {
  it("accepts a client with first/last name and phone contact", () => {
    const result = clientSchema.safeParse({
      firstName: "Ana",
      lastName: "García",
      phone: "1122334455",
      email: "",
      notes: "",
    });

    expect(result.success).toBe(true);
  });

  it("accepts a client with only email as contact (no phone required)", () => {
    const result = clientSchema.safeParse({
      firstName: "Luz",
      lastName: "Pérez",
      phone: "",
      email: "luz@example.com",
      notes: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing first name", () => {
    const result = clientSchema.safeParse({
      firstName: "",
      lastName: "García",
      phone: "1122334455",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.firstName).toContain(
        "El nombre es obligatorio",
      );
    }
  });

  it("rejects a missing last name", () => {
    const result = clientSchema.safeParse({
      firstName: "Ana",
      lastName: "",
      phone: "1122334455",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.lastName).toContain(
        "El apellido es obligatorio",
      );
    }
  });

  it("rejects when neither phone nor email is provided", () => {
    const result = clientSchema.safeParse({
      firstName: "Ana",
      lastName: "García",
      phone: "",
      email: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().formErrors).toContain(
        "Ingresá al menos un teléfono o email de contacto.",
      );
    }
  });

  it("rejects a malformed email when provided", () => {
    const result = clientSchema.safeParse({
      firstName: "Ana",
      lastName: "García",
      phone: "",
      email: "not-an-email",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        "Email inválido",
      );
    }
  });
});
