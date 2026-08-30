"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CashActionState } from "@/features/cash/actions/open-session";

const initialState: CashActionState = { error: null };

/**
 * "Abrir caja" form (spec: "cash-register / Daily session lifecycle"). The
 * business date is fixed to today (BA) and passed as a hidden input; the
 * operator only enters the counted opening amount — there is no DB
 * carry-forward, `previousCounted` is an advisory prefill only.
 */
export function OpenSessionForm({
  action,
  businessDate,
  previousCounted,
}: {
  action: (
    state: CashActionState,
    formData: FormData,
  ) => Promise<CashActionState>;
  businessDate: string;
  previousCounted?: number | null;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="businessDate" value={businessDate} />
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="openingAmount">Monto de apertura</Label>
        <Input
          id="openingAmount"
          name="openingAmount"
          type="number"
          min={0}
          step="0.01"
          defaultValue={previousCounted ?? undefined}
          required
        />
        {previousCounted != null ? (
          <p className="text-xs text-muted-foreground">
            Cierre anterior: {previousCounted}. Ajustá si contaste algo distinto.
          </p>
        ) : null}
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Abriendo…" : "Abrir caja"}
        </Button>
      </div>
    </form>
  );
}
