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
import type { CashActionState } from "@/features/cash/actions/open-session";
import type { MovementKind } from "@/features/cash/domain/movement";

const initialState: CashActionState = { error: null };

const KIND_LABEL: Record<MovementKind, string> = {
  retiro: "Retiro (sale del cajón)",
  ingreso: "Ingreso (entra al cajón)",
  ajuste: "Ajuste",
};

/**
 * "Registrar movimiento" form (spec: "cash-register / Cash movements"). For an
 * `ajuste` the operator must pick a direction — `directionForKind` in the
 * server action throws without one — so the direction select only appears for
 * that kind.
 */
export function MovementForm({
  action,
}: {
  action: (
    state: CashActionState,
    formData: FormData,
  ) => Promise<CashActionState>;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [kind, setKind] = useState<MovementKind>("retiro");
  const [direction, setDirection] = useState<"in" | "out">("out");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="kind">Tipo</Label>
          <Select
            value={kind}
            onValueChange={(value) => setKind(value as MovementKind)}
          >
            <SelectTrigger id="kind" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(KIND_LABEL) as MovementKind[]).map((value) => (
                <SelectItem key={value} value={value}>
                  {KIND_LABEL[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="kind" value={kind} />
        </div>
        {kind === "ajuste" ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="direction">Dirección del ajuste</Label>
            <Select
              value={direction}
              onValueChange={(value) => setDirection(value as "in" | "out")}
            >
              <SelectTrigger id="direction" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in">Suma al cajón</SelectItem>
                <SelectItem value="out">Resta del cajón</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {kind === "ajuste" ? (
          <input type="hidden" name="direction" value={direction} />
        ) : null}
        <div className="flex flex-col gap-2">
          <Label htmlFor="amount">Monto</Label>
          <Input
            id="amount"
            name="amount"
            type="number"
            min={0}
            step="0.01"
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="reason">Motivo</Label>
          <Input id="reason" name="reason" type="text" required />
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar movimiento"}
        </Button>
      </div>
    </form>
  );
}
