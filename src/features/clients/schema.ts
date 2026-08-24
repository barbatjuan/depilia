import { z } from "zod";

/**
 * Client create/edit schema, shared by the client form (client-side UX) and
 * the create/update server actions (the real validation boundary). At least
 * one contact channel (phone or email) is required — pure business rule
 * enforced with `.superRefine` so it surfaces as a form-level error.
 */
export const clientSchema = z
  .object({
    firstName: z.string().min(1, "El nombre es obligatorio"),
    lastName: z.string().min(1, "El apellido es obligatorio"),
    phone: z.string().optional().default(""),
    email: z
      .union([z.literal(""), z.string().email("Email inválido")])
      .optional()
      .default(""),
    notes: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (!data.phone.trim() && !data.email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Ingresá al menos un teléfono o email de contacto.",
      });
    }
  });

export type ClientInput = z.infer<typeof clientSchema>;
