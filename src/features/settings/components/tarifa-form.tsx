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
import { SIZE_LABEL, SIZE_ORDER } from "@/features/packages/domain/tariff-picker";
import { GENDER_LABEL } from "@/features/packages/domain/tariff-picker";
import {
  TARIFA_GENDERS,
  TARIFA_VAT_DEFAULT,
  type TarifaGender,
  type TarifaSize,
} from "@/features/settings/schema";
import type { TarifaFormState } from "@/features/settings/actions/create-tarifa";
import type { TariffRow } from "@/features/settings/data/tarifas";

const initialState: TarifaFormState = { error: null };

export function TarifaForm({
  action,
  submitLabel,
  zones = [],
  tarifa,
}: {
  action: (
    state: TarifaFormState,
    formData: FormData,
  ) => Promise<TarifaFormState>;
  submitLabel: string;
  zones?: string[];
  tarifa?: TariffRow;
}) {
  const isEdit = Boolean(tarifa);
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [gender, setGender] = useState<TarifaGender>(
    (tarifa?.gender as TarifaGender) ?? "mujer",
  );
  const [size, setSize] = useState<TarifaSize>(
    (tarifa?.sizeCategory as TarifaSize) ?? "mini",
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="zoneName">Zona</Label>
        {isEdit ? (
          <Input id="zoneName" value={tarifa!.zoneName} disabled readOnly />
        ) : (
          <>
            <Input
              id="zoneName"
              name="zoneName"
              list="zonas-list"
              autoComplete="off"
              required
            />
            <datalist id="zonas-list">
              {zones.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
            <p className="text-xs text-muted-foreground">
              Elegí una zona existente o escribí una nueva.
            </p>
          </>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label>Género</Label>
        {isEdit ? (
          <Input value={GENDER_LABEL[gender]} disabled readOnly />
        ) : (
          <div className="flex gap-2">
            {TARIFA_GENDERS.map((g) => (
              <Button
                key={g}
                type="button"
                variant={gender === g ? "default" : "outline"}
                size="sm"
                aria-pressed={gender === g}
                onClick={() => setGender(g)}
              >
                {GENDER_LABEL[g]}
              </Button>
            ))}
          </div>
        )}
        {!isEdit ? (
          <input type="hidden" name="gender" value={gender} />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="sizeSelect">Tamaño</Label>
        <Select
          value={size}
          onValueChange={(value) => setSize(value as TarifaSize)}
        >
          <SelectTrigger id="sizeSelect" className="w-full">
            <SelectValue placeholder="Elegí un tamaño" />
          </SelectTrigger>
          <SelectContent>
            {SIZE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {SIZE_LABEL[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="sizeCategory" value={size} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="sessionPrice">Precio por sesión</Label>
          <Input
            id="sessionPrice"
            name="sessionPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={tarifa?.sessionPrice}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bonoPrice">Precio del bono</Label>
          <Input
            id="bonoPrice"
            name="bonoPrice"
            type="number"
            min={0}
            step="0.01"
            defaultValue={tarifa?.bonoPrice}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="vatPercent">IVA (%)</Label>
          <Input
            id="vatPercent"
            name="vatPercent"
            type="number"
            min={0}
            max={99.9}
            step="0.1"
            defaultValue={
              tarifa
                ? Math.round(tarifa.vatRate * 1000) / 10
                : TARIFA_VAT_DEFAULT * 100
            }
          />
          <p className="text-xs text-muted-foreground">
            0 = exento. Los precios ya incluyen IVA.
          </p>
        </div>
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
