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
import { ManualDiscountFields } from "@/features/packages/components/manual-discount-fields";
import type { SellPackageFormState } from "@/features/packages/actions/sell-package";
import type {
  Gender,
  PackageTemplateOption,
} from "@/features/packages/domain/sell-package";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";
import type { BonusPromotionOption } from "@/features/promotions/data/promotions";
import {
  GENDER_LABEL,
  filterTariffs,
  groupTariffsBySize,
} from "@/features/packages/domain/tariff-picker";

const CUSTOM_OPTION = "personalizado";
const PROMO_PREFIX = "promo:";
const GENDERS: Gender[] = ["mujer", "hombre"];
const initialState: SellPackageFormState = { error: null };

export function SellPackageForm({
  action,
  templates,
  zones,
  promotions = [],
  onSuccess,
}: {
  action: (
    state: SellPackageFormState,
    formData: FormData,
  ) => Promise<SellPackageFormState>;
  templates: PackageTemplateOption[];
  zones: BodyZoneOption[];
  promotions?: BonusPromotionOption[];
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const moneyFormat = useMoneyFormat();
  const [gender, setGender] = useState<Gender>("mujer");
  const [selection, setSelection] = useState<string>(CUSTOM_OPTION);
  const [zoneId, setZoneId] = useState<string>("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const isCustom = selection === CUSTOM_OPTION;
  const isPromotion = selection.startsWith(PROMO_PREFIX);
  const promotionId = isPromotion ? selection.slice(PROMO_PREFIX.length) : "";
  const selectedPromotion =
    promotions.find((p) => p.id === promotionId) ?? null;
  const zoneName = zones.find((z) => z.id === zoneId)?.name ?? "";

  const genderTariffs = useMemo(
    () => filterTariffs(templates, { gender }),
    [templates, gender],
  );
  const groups = useMemo(
    () => groupTariffsBySize(genderTariffs),
    [genderTariffs],
  );
  const selectedTariff = genderTariffs.find((t) => t.id === selection) ?? null;

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
                setSelection(CUSTOM_OPTION);
              }}
            >
              {GENDER_LABEL[g]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="templateSelect">Paquete</Label>
        <Select value={selection} onValueChange={setSelection}>
          <SelectTrigger id="templateSelect" className="w-full">
            <SelectValue placeholder="Elegí un paquete" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((group) => (
              <SelectGroup key={group.sizeCategory}>
                <SelectLabel>{group.label}</SelectLabel>
                {group.tariffs.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} — bono {t.defaultSessions} sesiones (
                    {formatMoney(t.bonoPrice, moneyFormat)})
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            {promotions.length > 0 ? (
              <SelectGroup>
                <SelectLabel>Promociones</SelectLabel>
                {promotions.map((p) => (
                  <SelectItem key={p.id} value={`${PROMO_PREFIX}${p.id}`}>
                    {p.name} — {p.tariff.name} ({p.tariff.defaultSessions}+
                    {p.bonusSessions} sesiones)
                  </SelectItem>
                ))}
              </SelectGroup>
            ) : null}
            <SelectItem value={CUSTOM_OPTION}>
              Personalizado (zona + sesiones)
            </SelectItem>
          </SelectContent>
        </Select>
        <input
          type="hidden"
          name="templateId"
          value={isCustom || isPromotion ? "" : selection}
        />
        <input type="hidden" name="promotionId" value={promotionId} />
        {selectedTariff ? (
          <p className="text-sm text-muted-foreground">
            {selectedTariff.defaultSessions} sesiones ·{" "}
            {formatMoney(selectedTariff.bonoPrice, moneyFormat)}
          </p>
        ) : null}
        {selectedPromotion ? (
          <p className="text-sm text-muted-foreground">
            {selectedPromotion.tariff.defaultSessions}+
            {selectedPromotion.bonusSessions} sesiones ·{" "}
            {formatMoney(
              selectedPromotion.overridePrice ??
                selectedPromotion.tariff.bonoPrice,
              moneyFormat,
            )}
          </p>
        ) : null}
      </div>

      {isCustom ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="flex flex-col gap-2">
            <Label htmlFor="zoneId">Zona</Label>
            <Select value={zoneId} onValueChange={setZoneId}>
              <SelectTrigger id="zoneId" className="w-full">
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
            <input type="hidden" name="zoneName" value={zoneName} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="sessionCount">Sesiones</Label>
            <Input
              id="sessionCount"
              name="sessionCount"
              type="number"
              min={1}
              step={1}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="price">Precio</Label>
            <Input id="price" name="price" type="number" min={0} step="0.01" />
          </div>
        </div>
      ) : null}

      <ManualDiscountFields />

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Vender paquete"}
        </Button>
      </div>
    </form>
  );
}
