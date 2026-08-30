"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ExpenseFormState } from "@/features/expenses/actions/create-expense";
import type { ExpenseRow } from "@/features/expenses/data/expenses";
import type { ExpenseCategoryRow } from "@/features/expenses/data/categories";
import { EXPENSE_METHODS, EXPENSE_METHOD_LABEL } from "@/features/expenses/schema";

const initialState: ExpenseFormState = { error: null };

/** "nuevo gasto" / "editar gasto" form — categoría dropdown, monto, fecha, descripción. */
export function ExpenseForm({
  action,
  categories,
  expense,
  submitLabel,
}: {
  action: (
    state: ExpenseFormState,
    formData: FormData,
  ) => Promise<ExpenseFormState>;
  categories: ExpenseCategoryRow[];
  expense?: ExpenseRow;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [categoryId, setCategoryId] = useState(expense?.categoryId ?? "");
  const [method, setMethod] = useState<string>(expense?.method ?? "cash");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="categoryId">Categoría</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger id="categoryId" className="w-full">
              <SelectValue placeholder="Elegí una categoría" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="categoryId" value={categoryId} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={expense?.amount}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="method">Medio de pago</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger id="method" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPENSE_METHODS.map((value) => (
                <SelectItem key={value} value={value}>
                  {EXPENSE_METHOD_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="method" value={method} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="spentOn">Fecha</Label>
          <Input
            id="spentOn"
            name="spentOn"
            type="date"
            defaultValue={expense?.spentOn}
            required
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="description">Descripción</Label>
        <Input
          id="description"
          name="description"
          defaultValue={expense?.description ?? ""}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
