"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMoneyFormat } from "@/components/money-format-provider";
import { formatMoney } from "@/lib/money";
import type { SellLooseSessionFormState } from "@/features/packages/actions/sell-loose-session";
import type {
  Gender,
  PackageTemplateOption,
} from "@/features/packages/domain/sell-package";
import {
  GENDER_LABEL,
  filterTariffs,
  groupTariffsBySize,
} from "@/features/packages/domain/tariff-picker";

const GENDERS: Gender[] = ["mujer", "hombre"];
const initialState: SellLooseSessionFormState = { error: null };

export function SellLooseSessionForm({
  action,
  templates,
  onSuccess,
}: {
  action: (
    state: SellLooseSessionFormState,
    formData: FormData,
  ) => Promise<SellLooseSessionFormState>;
  templates: PackageTemplateOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const moneyFormat = useMoneyFormat();
  const [gender, setGender] = useState<Gender>("mujer");
  const [templateId, setTemplateId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const genderTariffs = useMemo(
    () => filterTariffs(templates, { gender }),
    [templates, gender],
  );
  const groups = useMemo(
    () => groupTariffsBySize(genderTariffs),
    [genderTariffs],
  );
  const selectedTariff =
    genderTariffs.find((t) => t.id === templateId) ?? null;

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
      <div className="flex flex-col gap-2">
        <Label>Género</Label>
        <div className="flex gap-2">
          {GENDERS.map((g) => (
            <Button
              key={g}
              type="button"
              variant={gender === g ? "default" : "outline"}
              size="sm"
              aria-pressed={gender === g}
              onClick={() => {
                setGender(g);
                setTemplateId("");
                setAmount("");
              }}
            >
              {GENDER_LABEL[g]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="looseTemplateId">Tarifa</Label>
        <Select
          value={templateId}
          onValueChange={(value) => {
            setTemplateId(value);
            const tariff = genderTariffs.find((t) => t.id === value);
            if (tariff) setAmount(String(tariff.sessionPrice));
          }}
        >
          <SelectTrigger id="looseTemplateId" className="w-full">
            <SelectValue placeholder="Elegí una tarifa" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.sizeCategory}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.tariffs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — sesión {formatMoney(t.sessionPrice, moneyFormat)}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
        <input type="hidden" name="templateId" value={templateId} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="loosePrice">Precio</Label>
        <Input
          id="loosePrice"
          name="amount"
          type="number"
          min={0}
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        {selectedTariff ? (
          <p className="text-sm text-muted-foreground">
            Precio sugerido:{" "}
            {formatMoney(selectedTariff.sessionPrice, moneyFormat)} (editable)
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
          {isPending ? "Guardando…" : "Vender sesión suelta"}
        </Button>
      </div>
    </form>
  );
}
