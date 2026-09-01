"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DiscountKind = "" | "percent" | "fixed";

/**
 * Optional per-sale manual discount block, shared by "vender paquete" and
 * "sesión suelta" (spec: "sale-discounts / Manual discount at both flows").
 * Emits `discountKind` / `discountValue` / `discountReason` form fields; the
 * server action + `sellPackageSchema` are the real validation boundary.
 *
 * NOTE (P3): the discount-code input will live next to this block and be
 * mutually exclusive with it — P3 wires the "código XOR descuento manual"
 * toggle. This slice only ships the manual path.
 */
export function ManualDiscountFields() {
  const [kind, setKind] = useState<DiscountKind>("");

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label>Descuento (opcional)</Label>
      <input type="hidden" name="discountKind" value={kind} />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={kind === "percent" ? "default" : "outline"}
          aria-pressed={kind === "percent"}
          onClick={() => setKind(kind === "percent" ? "" : "percent")}
        >
          %
        </Button>
        <Button
          type="button"
          size="sm"
          variant={kind === "fixed" ? "default" : "outline"}
          aria-pressed={kind === "fixed"}
          onClick={() => setKind(kind === "fixed" ? "" : "fixed")}
        >
          Monto fijo
        </Button>
      </div>

      {kind !== "" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountValue">
              {kind === "percent" ? "Porcentaje" : "Monto"}
            </Label>
            <Input
              id="discountValue"
              name="discountValue"
              type="number"
              min={0}
              step={kind === "percent" ? 1 : "0.01"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountReason">Motivo</Label>
            <Input id="discountReason" name="discountReason" type="text" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
