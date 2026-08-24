import { z } from "zod";

/**
 * Login credentials schema, shared by the login form (client-side UX) and
 * the `signIn` server action (the real validation boundary).
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "El email es obligatorio")
    .email("Email inválido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type LoginInput = z.infer<typeof loginSchema>;
