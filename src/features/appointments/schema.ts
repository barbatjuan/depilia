import { z } from "zod";

/**
 * New-appointment schema, shared by the booking form and the
 * `createAppointmentAction` server action (the real validation boundary).
 * `clientPackageId` and `looseSaleId` are mutually exclusive — an
 * appointment can be linked to at most one of a session-based package or a
 * pre-paid loose session sale, never both (spec: "package-sessions").
 */
export const createAppointmentSchema = z
  .object({
    clientId: z.string().uuid("Elegí un cliente."),
    zoneId: z.string().uuid("Elegí una zona."),
    scheduledAt: z.string().min(1, "Elegí una fecha y hora."),
    durationMinutes: z.coerce
      .number()
      .int()
      .positive("La duración debe ser mayor a 0."),
    // `.nullish()` (not `.optional()`) — the booking form renders no
    // `notes` input at all, so `formData.get("notes")` is `null`, not
    // `undefined`; `.optional()` alone rejects `null` (same class of bug
    // fixed in `features/packages/schema.ts`'s `optionalUuid`/
    // `optionalNumeric`, caught by the same E2E golden path run).
    notes: z
      .string()
      .nullish()
      .transform((value) => value ?? ""),
    clientPackageId: z
      .union([z.literal(""), z.string().uuid()])
      .optional()
      .default(""),
    looseSaleId: z
      .union([z.literal(""), z.string().uuid()])
      .optional()
      .default(""),
  })
  .superRefine((data, ctx) => {
    if (data.clientPackageId && data.looseSaleId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Elegí un paquete o una sesión suelta, no ambos.",
      });
    }
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

/** Reschedule schema (spec: "Edit/reschedule an appointment"). */
export const rescheduleAppointmentSchema = z.object({
  scheduledAt: z.string().min(1, "Elegí una fecha y hora."),
  durationMinutes: z.coerce
    .number()
    .int()
    .positive("La duración debe ser mayor a 0."),
});

export type RescheduleAppointmentInput = z.infer<
  typeof rescheduleAppointmentSchema
>;

/**
 * Valid `set_appointment_status` targets from the UI — `scheduled` is
 * intentionally excluded, it's never a user-driven transition target (see
 * `domain/status.ts`'s decision table).
 */
export const appointmentStatusSchema = z.enum([
  "completed",
  "cancelled",
  "no_show",
]);
