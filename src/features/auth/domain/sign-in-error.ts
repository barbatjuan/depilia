export type SupabaseAuthError = { message: string } | null | undefined;

/**
 * Maps a raw Supabase Auth error to a Spanish, user-facing message.
 * Pure — no I/O — so every case is unit-testable without mocking Supabase.
 */
export function toSignInErrorMessage(error: SupabaseAuthError): string | null {
  if (!error) return null;

  if (error.message === "Invalid login credentials") {
    return "Email o contraseña incorrectos.";
  }

  return "No se pudo iniciar sesión. Intentá de nuevo.";
}
