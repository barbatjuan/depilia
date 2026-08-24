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
import type { CreateAppointmentFormState } from "@/features/appointments/actions/create-appointment";
import { getBookingOptionsAction } from "@/features/appointments/actions/get-booking-options";
import type { ClientRow } from "@/features/clients/data/clients";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";

const initialState: CreateAppointmentFormState = { error: null };
const NONE_OPTION = "ninguno";

/**
 * Booking form (spec: "appointment-scheduling / Book appointment"): pick a
 * client, a zone, a date/time, and — optionally — link the appointment to
 * one of that client's active `client_packages` OR one of their unclaimed
 * loose-session sales (mutually exclusive, task: reuse the Paquetes/Sesiones
 * sale rows instead of rebuilding that side). The datetime-local input is
 * always interpreted as Buenos Aires local time, regardless of the
 * browser's own timezone — the clinic only ever operates in one timezone.
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
  zones: BodyZoneOption[];
  defaultDateTime?: string;
  onSuccess?: () => void;
}) {
  const [state, formAction, isPending] = useActionState(
    action,
    initialState,
  );
  const [clientId, setClientId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [localDateTime, setLocalDateTime] = useState(defaultDateTime ?? "");
  const [linkSelection, setLinkSelection] = useState(NONE_OPTION);
  const [options, setOptions] = useState<{
    packages: { id: string; zoneId: string; zoneName: string; remaining: number }[];
    looseSales: { id: string; description: string; total: number }[];
  }>({ packages: [], looseSales: [] });
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    setLinkSelection(NONE_OPTION);
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

  const scheduledAtIso = localDateTime
    ? new Date(`${localDateTime}:00-03:00`).toISOString()
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
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="bookZone">Zona</Label>
        <Select value={zoneId} onValueChange={setZoneId}>
          <SelectTrigger id="bookZone" className="w-full">
            <SelectValue placeholder="Elegí una zona" />
          </SelectTrigger>
          <SelectContent>
            {zones.map((z) => (
              <SelectItem key={z.id} value={z.id}>
                {z.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookDateTime">Fecha y hora</Label>
          <Input
            id="bookDateTime"
            type="datetime-local"
            value={localDateTime}
            onChange={(e) => setLocalDateTime(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="bookDuration">Duración (min)</Label>
          <Input
            id="bookDuration"
            name="durationMinutes"
            type="number"
            min={5}
            step={5}
            defaultValue={30}
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
