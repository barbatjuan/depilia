"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { BookAppointmentForm } from "@/features/appointments/components/book-appointment-form";
import { createAppointmentAction } from "@/features/appointments/actions/create-appointment";
import type { ClientRow } from "@/features/clients/data/clients";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";

/** Agenda's "nuevo turno" entry point, same slide-over pattern as PackageSaleActions. */
export function BookAppointmentSheet({
  clients,
  zones,
  defaultDateTime,
}: {
  clients: ClientRow[];
  zones: BodyZoneOption[];
  defaultDateTime?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button size="sm">
          <Plus className="size-4" />
          Nuevo turno
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nuevo turno</SheetTitle>
          <SheetDescription>
            Elegí cliente, zona y horario. Opcionalmente vinculá una sesión
            de paquete o suelta ya pagada.
          </SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-4 px-4 pb-4">
          <BookAppointmentForm
            action={createAppointmentAction}
            clients={clients}
            zones={zones}
            defaultDateTime={defaultDateTime}
            onSuccess={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
