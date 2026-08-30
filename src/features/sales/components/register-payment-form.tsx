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
import type { RegisterPaymentFormState } from "@/features/sales/actions/register-payment";

const initialState: RegisterPaymentFormState = { error: null, warning: null };

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

/**
 * "Registrar pago" form on the sale detail page (spec: "sales-and-payments /
 * Register a partial payment" — the "pagos en cuotas" feature). The
 * overpayment ceiling is the DB trigger's job; a rejection surfaces here as
 * the friendly message the server action already mapped, not a raw error.
 */
export function RegisterPaymentForm({
  action,
}: {
  action: (
    state: RegisterPaymentFormState,
    formData: FormData,
  ) => Promise<RegisterPaymentFormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [method, setMethod] = useState("cash");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Monto</Label>
          <Input id="amount" name="amount" type="number" min={0} step="0.01" />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="method">Método</Label>
          <Select value={method} onValueChange={setMethod}>
            <SelectTrigger id="method" className="w-full">
              <SelectValue placeholder="Método" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(METHOD_LABEL).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="method" value={method} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="note">Nota (opcional)</Label>
          <Input id="note" name="note" type="text" />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.warning ? (
        <p
          role="status"
          className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          {state.warning}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}
