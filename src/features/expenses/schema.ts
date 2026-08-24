import { z } from "zod";

/**
 * Expense create/edit schema, shared by the expense form and the
 * create/update server actions. `amount` is coerced from the form's string
 * input, matching the `registerPaymentSchema` pattern in `features/sales`.
 */
export const expenseSchema = z.object({
  categoryId: z.string().min(1, "Elegí una categoría"),
  amount: z.coerce.number().positive("El monto debe ser mayor a 0"),
  description: z.string().optional().default(""),
  spentOn: z.string().min(1, "La fecha es obligatoria"),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;

/** Category create/edit schema (`expense_categories.name`). */
export const expenseCategorySchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
});

export type ExpenseCategoryInput = z.infer<typeof expenseCategorySchema>;
