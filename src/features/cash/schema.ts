import { z } from "zod";

/**
 * Cash-register form/action schemas, shared by the client forms and the
 * server actions (pattern: `features/sales/schema`). Shape validation only —
 * the money invariants are enforced by migration `0011_cash_register.sql`.
 */
export const MOVEMENT_KINDS = ["retiro", "ingreso", "ajuste"] as const;
export const MOVEMENT_DIRECTIONS = ["in", "out"] as const;

export const openSessionSchema = z.object({
  businessDate: z.string().min(1, "La fecha es obligatoria"),
  openingAmount: z.coerce
    .number()
    .nonnegative("El monto de apertura no puede ser negativo"),
});

export type OpenSessionInput = z.infer<typeof openSessionSchema>;

export const closeSessionSchema = z.object({
  sessionId: z.string().uuid(),
  countedAmount: z.coerce
    .number()
    .nonnegative("El monto contado no puede ser negativo"),
  closingNote: z.string().trim().optional(),
});

export type CloseSessionInput = z.infer<typeof closeSessionSchema>;

export const movementSchema = z.object({
  sessionId: z.string().uuid(),
  kind: z.enum(MOVEMENT_KINDS),
  direction: z.enum(MOVEMENT_DIRECTIONS),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  reason: z.string().trim().min(1, "Indicá un motivo"),
});

export type MovementInput = z.infer<typeof movementSchema>;
