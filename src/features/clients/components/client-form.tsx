"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ClientFormState } from "@/features/clients/actions/create-client";
import type { ClientRow } from "@/features/clients/data/clients";

const initialState: ClientFormState = { error: null };

export function ClientForm({
  action,
  client,
  submitLabel,
}: {
  action: (
    state: ClientFormState,
    formData: FormData,
  ) => Promise<ClientFormState>;
  client?: ClientRow;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, initialState);
  const [gender, setGender] = useState(client?.gender ?? "");

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="gender" value={gender} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="firstName">Nombre</Label>
          <Input
            id="firstName"
            name="firstName"
            defaultValue={client?.firstName}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="lastName">Apellido</Label>
          <Input
            id="lastName"
            name="lastName"
            defaultValue={client?.lastName}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="clientGender">Sexo</Label>
          <Select value={gender} onValueChange={setGender}>
            <SelectTrigger id="clientGender" className="w-full">
              <SelectValue placeholder="Elegí" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mujer">Mujer</SelectItem>
              <SelectItem value="hombre">Hombre</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">Teléfono</Label>
          <Input
            id="phone"
            name="phone"
            defaultValue={client?.phone ?? ""}
            autoComplete="tel"
          />
        </div>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={client?.email ?? ""}
            autoComplete="email"
          />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notas</Label>
        <Textarea id="notes" name="notes" defaultValue={client?.notes ?? ""} />
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
