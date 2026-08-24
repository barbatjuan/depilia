"use client";

import { useActionState, useEffect, useState } from "react";
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
import type { SellLooseSessionFormState } from "@/features/packages/actions/sell-loose-session";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";

const initialState: SellLooseSessionFormState = { error: null };

export function SellLooseSessionForm({
  action,
  zones,
  onSuccess,
}: {
  action: (
    state: SellLooseSessionFormState,
    formData: FormData,
  ) => Promise<SellLooseSessionFormState>;
  zones: BodyZoneOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [zoneId, setZoneId] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (hasSubmitted && !isPending && state.error === null) {
      onSuccess?.();
    }
  }, [hasSubmitted, isPending, state, onSuccess]);

  return (
    <form
      action={(formData) => {
        setHasSubmitted(true);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="looseZoneId">Zona</Label>
          <Select value={zoneId} onValueChange={setZoneId}>
            <SelectTrigger id="looseZoneId" className="w-full">
              <SelectValue placeholder="Zona" />
            </SelectTrigger>
            <SelectContent>
              {zones.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <input type="hidden" name="zoneId" value={zoneId} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="loosePrice">Precio</Label>
          <Input
            id="loosePrice"
            name="price"
            type="number"
            min={0}
            step="0.01"
          />
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Vender sesión suelta"}
        </Button>
      </div>
    </form>
  );
}
