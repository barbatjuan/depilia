"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type DiscountMode = "" | "percent" | "fixed" | "code";

/**
 * Optional per-sale discount block, shared by "vender paquete" and "sesión
 * suelta" (spec: "sale-discounts / Manual discount at both flows" +
 * "discount-codes / Codes apply to both sell flows"). The operator picks one
 * mode: a manual percent / fixed amount, OR a discount code — never both
 * (spec: "Code XOR manual"). The hidden `discountKind` only ever carries
 * `percent` / `fixed`; `discountCode` is only present in code mode, so the
 * server action + `sellPackageSchema` (the real boundary) see a clean XOR.
 */
export function ManualDiscountFields() {
  const [mode, setMode] = useState<DiscountMode>("");
  const toggle = (next: DiscountMode) =>
    setMode((current) => (current === next ? "" : next));

  return (
    <div className="flex flex-col gap-2 rounded-md border p-3">
      <Label>Descuento (opcional)</Label>
      <input
        type="hidden"
        name="discountKind"
        value={mode === "percent" || mode === "fixed" ? mode : ""}
      />
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={mode === "percent" ? "default" : "outline"}
          aria-pressed={mode === "percent"}
          onClick={() => toggle("percent")}
        >
          %
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "fixed" ? "default" : "outline"}
          aria-pressed={mode === "fixed"}
          onClick={() => toggle("fixed")}
        >
          Monto fijo
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "code" ? "default" : "outline"}
          aria-pressed={mode === "code"}
          onClick={() => toggle("code")}
        >
          Código
        </Button>
      </div>

      {mode === "percent" || mode === "fixed" ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountValue">
              {mode === "percent" ? "Porcentaje" : "Monto"}
            </Label>
            <Input
              id="discountValue"
              name="discountValue"
              type="number"
              min={0}
              step={mode === "percent" ? 1 : "0.01"}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="discountReason">Motivo</Label>
            <Input id="discountReason" name="discountReason" type="text" />
          </div>
        </div>
      ) : null}

      {mode === "code" ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor="discountCode">Código de descuento</Label>
          <Input
            id="discountCode"
            name="discountCode"
            type="text"
            autoCapitalize="characters"
          />
        </div>
      ) : null}
    </div>
  );
}
