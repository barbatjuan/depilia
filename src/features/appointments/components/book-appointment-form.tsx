"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
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
import type { CreateAppointmentFormState } from "@/features/appointments/actions/create-appointment";
import { getBookingOptionsAction } from "@/features/appointments/actions/get-booking-options";
import { getAvailableSlotsAction } from "@/features/appointments/actions/get-available-slots";
import type { ClientRow } from "@/features/clients/data/clients";
import type { GenderedZoneOption } from "@/features/packages/data/package-templates";
import { zonesForGender } from "@/features/appointments/domain/zones-for-gender";
import { snapToQuarter } from "@/features/appointments/domain/time-slots";

const initialState: CreateAppointmentFormState = { error: null };
const NONE_OPTION = "ninguno";
const DEFAULT_DURATION = 30;
const GENDERS = [
  { value: "mujer", label: "Mujer" },
  { value: "hombre", label: "Hombre" },
];
const GENDER_LABEL: Record<string, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
};

function splitDefault(value?: string): { date: string; time: string } {
  const [date = "", rawTime = ""] = (value ?? "").split("T");
  return { date, time: rawTime ? snapToQuarter(rawTime) : "" };
}

/**
 * Booking form (spec: "appointment-scheduling / Book appointment"): pick a
 * client, a zone, a date + 15-minute time slot, and — optionally — link the
 * appointment to one of that client's active `client_packages` OR one of
 * their unclaimed loose-session sales (mutually exclusive).
 *
 * The (zone × gender) tariff filter uses the client's own recorded sex when
 * it has one; only clients with no sex on file get asked. The date/time is
 * always Buenos Aires local — the clinic only operates in one timezone.
 */
export function BookAppointmentForm({
  action,
  clients,
  zones,
  defaultDateTime,
  onSuccess,
}: {
  action: (
    state: CreateAppointmentFormState,
    formData: FormData,
  ) => Promise<CreateAppointmentFormState>;
  clients: ClientRow[];
  zones: GenderedZoneOption[];
  defaultDateTime?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);

  const defaults = useMemo(() => splitDefault(defaultDateTime), [defaultDateTime]);
  const [clientId, setClientId] = useState("");
  const [manualGender, setManualGender] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [date, setDate] = useState(defaults.date);
  const [time, setTime] = useState(defaults.time);
  const [durationMinutes, setDurationMinutes] = useState(DEFAULT_DURATION);
  const [linkSelection, setLinkSelection] = useState(NONE_OPTION);
  const [options, setOptions] = useState<{
    packages: { id: string; zoneId: string; zoneName: string; remaining: number }[];
    looseSales: { id: string; description: string; total: number }[];
  }>({ packages: [], looseSales: [] });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const selectedClient = clients.find((c) => c.id === clientId);
  const clientGender = selectedClient?.gender ?? "";
  const effectiveGender = clientGender || manualGender;
  const askGender = Boolean(clientId) && !clientGender;
  const zoneOptions = zonesForGender(zones, effectiveGender);

  useEffect(() => {
    setLinkSelection(NONE_OPTION);
    setManualGender("");
    setZoneId("");
    if (!clientId) {
      setOptions({ packages: [], looseSales: [] });
      return;
    }
    getBookingOptionsAction(clientId).then(setOptions);
  }, [clientId]);

  useEffect(() => {
    if (hasSubmitted && !isPending && state.error === null) {
      onSuccess?.();
    }
  }, [hasSubmitted, isPending, state, onSuccess]);

  useEffect(() => {
    let cancelled = false;
    getAvailableSlotsAction(date, durationMinutes).then((slots) => {
      if (cancelled) return;
      setAvailableSlots(slots);
      setTime((current) => (current && !slots.includes(current) ? "" : current));
    });
    return () => {
      cancelled = true;
    };
  }, [date, durationMinutes]);

  const scheduledAtIso =
    date && time
      ? new Date(`${date}T${time}:00-03:00`).toISOString()
      : "";
  const isPackage = linkSelection.startsWith("package:");
  const isLoose = linkSelection.startsWith("loose:");
  const clientPackageId = isPackage ? linkSelection.slice("package:".length) : "";
  const looseSaleId = isLoose ? linkSelection.slice("loose:".length) : "";

  return (
    <form
      action={(formData) => {
        setHasSubmitted(true);
        formAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <input type="hidden" name="clientId" value={clientId} />
      <input type="hidden" name="zoneId" value={zoneId} />
      <input type="hidden" name="scheduledAt" value={scheduledAtIso} />
      <input type="hidden" name="clientPackageId" value={clientPackageId} />
      <input type="hidden" name="looseSaleId" value={looseSaleId} />

      <div className="flex flex-col gap-2">
        <Label htmlFor="bookClient">Cliente</Label>
        <Select value={clientId} onValueChange={setClientId}>
          <SelectTrigger id="bookClient" className="w-full">
            <SelectValue placeholder="Elegí un cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.firstName} {c.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clientGender ? (
          <p className="text-xs text-muted-foreground">
            Sexo: {GENDER_LABEL[clientGender] ?? clientGender} · las zonas se
            filtran por la tarifa correspondiente.
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {askGender ? (
          <div className="flex flex-col gap-2">
            <Label htmlFor="bookGender">Sexo</Label>
            <Select
              value={manualGender}
              onValueChange={(next) => {
                setManualGender(next);
                setZoneId("");
              }}
            >
              <SelectTrigger id="bookGender" className="w-full">
                <SelectValue placeholder="Elegí" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className={askGender ? "flex flex-col gap-2" : "flex flex-col gap-2 sm:col-span-2"}>
          <Label htmlFor="bookZone">Zona</Label>
          <Select
            value={zoneId}
            onValueChange={setZoneId}
            disabled={!effectiveGender}
          >
            <SelectTrigger id="bookZone" className="w-full">
              <SelectValue
                placeholder={
                  effectiveGender
                    ? "Elegí una zona"
                    : "Elegí el cliente / sexo primero"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {zoneOptions.map((z) => (
                <SelectItem key={z.id} value={z.id}>
                  {z.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bookDate">Fecha</Label>
        <Input
          id="bookDate"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookTime">Hora</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger id="bookTime" className="w-full">
              <SelectValue placeholder="--:--" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {availableSlots.map((slot) => (
                <SelectItem key={slot} value={slot}>
                  {slot}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookDuration">Duración (min)</Label>
          <Input
            id="bookDuration"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            value={durationMinutes}
            onChange={(e) => setDurationMinutes(Number(e.target.value) || 0)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bookLink">Sesión</Label>
        <Select
          value={linkSelection}
          onValueChange={setLinkSelection}
          disabled={!clientId}
        >
          <SelectTrigger id="bookLink" className="w-full">
            <SelectValue placeholder="Elegí una sesión" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_OPTION}>Turno suelto (sin vincular)</SelectItem>
            {options.packages.map((p) => (
              <SelectItem key={p.id} value={`package:${p.id}`}>
                Paquete {p.zoneName} — {p.remaining} sesiones restantes
              </SelectItem>
            ))}
            {options.looseSales.map((s) => (
              <SelectItem key={s.id} value={`loose:${s.id}`}>
                {s.description}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {clientId && options.packages.length === 0 && options.looseSales.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Este cliente no tiene paquetes activos ni sesiones sueltas
            disponibles — el turno se creará sin sesión vinculada.
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
          {isPending ? "Guardando…" : "Crear turno"}
        </Button>
      </div>
    </form>
  );
}
