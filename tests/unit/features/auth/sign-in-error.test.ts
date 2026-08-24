import { describe, expect, it } from "vitest";
import { toSignInErrorMessage } from "@/features/auth/domain/sign-in-error";

describe("toSignInErrorMessage", () => {
  it("returns null when there is no error", () => {
    expect(toSignInErrorMessage(null)).toBeNull();
  });

  it("maps invalid credentials to a Spanish message", () => {
    expect(
      toSignInErrorMessage({ message: "Invalid login credentials" }),
    ).toBe("Email o contraseña incorrectos.");
  });

  it("maps any other Supabase error to a generic Spanish message", () => {
    expect(toSignInErrorMessage({ message: "Network request failed" })).toBe(
      "No se pudo iniciar sesión. Intentá de nuevo.",
    );
  });
});
