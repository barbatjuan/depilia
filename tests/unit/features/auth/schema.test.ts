import { describe, expect, it } from "vitest";
import { loginSchema } from "@/features/auth/schema";

describe("loginSchema", () => {
  it("accepts a valid email and password", () => {
    const result = loginSchema.safeParse({
      email: "admin@depilia.test",
      password: "correcthorsebattery",
    });

    expect(result.success).toBe(true);
  });

  it("rejects a missing email", () => {
    const result = loginSchema.safeParse({
      email: "",
      password: "correcthorsebattery",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        "El email es obligatorio",
      );
    }
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({
      email: "admin@depilia.test",
      password: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.password).toContain(
        "La contraseña es obligatoria",
      );
    }
  });

  it("rejects a malformed email", () => {
    const result = loginSchema.safeParse({
      email: "not-an-email",
      password: "correcthorsebattery",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.email).toContain(
        "Email inválido",
      );
    }
  });
});
