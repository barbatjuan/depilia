"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CashActionState } from "@/features/cash/actions/open-session";
import { deriveArqueo, ARQUEO_LABEL } from "@/features/cash/domain/arqueo";

const initialState: CashActionState = { error: null };

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

/**
 * "Cerrar caja" arqueo form (spec: "cash-register / Closing arqueo"). Shows
 * the live theoretical, lets the operator enter the counted drawer, and
 * previews the difference live with `deriveArqueo` — the authoritative
 * snapshot is still written by the close trigger. The count is intentionally
 * not prefilled so the arqueo is a real count, not a blind confirmation.
 */
export function CloseSessionForm({
  action,
  theoretical,
}: {
  action: (
    state: CashActionState,
    formData: FormData,
  ) => Promise<CashActionState>;
  theoretical: number;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [counted, setCounted] = useState("");

  const parsedCounted = Number(counted);
  const preview =
    counted !== "" && Number.isFinite(parsedCounted)
      ? deriveArqueo(parsedCounted, theoretical)
      : null;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-md border p-3 text-sm">
        <span className="text-muted-foreground">Teórico esperado</span>
        <span className="font-semibold tabular-nums">
          {currencyFormatter.format(theoretical)}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:max-w-xs">
        <Label htmlFor="countedAmount">Monto contado</Label>
        <Input
          id="countedAmount"
          name="countedAmount"
          type="number"
          min={0}
          step="0.01"
          value={counted}
          onChange={(event) => setCounted(event.target.value)}
          required
        />
      </div>
      {preview ? (
        <p role="status" className="text-sm">
          {ARQUEO_LABEL[preview.status]}
          {preview.status !== "exacto"
            ? `: ${currencyFormatter.format(Math.abs(preview.difference))}`
            : ""}
        </p>
      ) : null}
      <div className="flex flex-col gap-2">
        <Label htmlFor="closingNote">Nota de cierre (opcional)</Label>
        <Textarea id="closingNote" name="closingNote" rows={2} />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Cerrando…" : "Cerrar caja"}
        </Button>
      </div>
    </form>
  );
}
