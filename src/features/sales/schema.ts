import { z } from "zod";

/**
 * "Register a payment" form/action schema (spec: "sales-and-payments /
 * Register a partial payment"). Re-used by the client-side form and the
 * server action; the overpayment ceiling itself is enforced by the DB
 * trigger (design decision 5's `payments_reject_overpayment`), not here —
 * this only validates shape (positive amount, allowed method).
 */
export const registerPaymentSchema = z.object({
  saleId: z.string().uuid(),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  method: z.enum(["cash", "card", "transfer", "other"]),
  note: z.string().trim().optional(),
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
