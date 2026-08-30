"use client";

import { useState } from "react";
import { PackagePlus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SellPackageForm } from "@/features/packages/components/sell-package-form";
import { SellLooseSessionForm } from "@/features/packages/components/sell-loose-session-form";
import { sellPackageAction } from "@/features/packages/actions/sell-package";
import { sellLooseSessionAction } from "@/features/packages/actions/sell-loose-session";
import type { PackageTemplateOption } from "@/features/packages/domain/sell-package";
import type { BodyZoneOption } from "@/features/packages/data/package-templates";

/**
 * Ficha sales entry point (spec: "package-sessions / Sell a package" and
 * "Sell a loose session"). Two slide-over forms triggered from the client
 * ficha; each closes itself on a successful sale, letting the server
 * action's `revalidatePath` refresh the ficha's package list underneath.
 */
export function PackageSaleActions({
  clientId,
  templates,
  zones,
}: {
  clientId: string;
  templates: PackageTemplateOption[];
  zones: BodyZoneOption[];
}) {
  const [packageOpen, setPackageOpen] = useState(false);
  const [looseOpen, setLooseOpen] = useState(false);
  const boundSellPackage = sellPackageAction.bind(null, clientId);
  const boundSellLoose = sellLooseSessionAction.bind(null, clientId);

  return (
    <div className="flex gap-2">
      <Sheet open={packageOpen} onOpenChange={setPackageOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <PackagePlus className="size-4" />
            Vender paquete
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Vender paquete</SheetTitle>
            <SheetDescription>
              Elegí un paquete del catálogo o armá uno a medida.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <SellPackageForm
              action={boundSellPackage}
              templates={templates}
              zones={zones}
              onSuccess={() => setPackageOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={looseOpen} onOpenChange={setLooseOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm">
            <Plus className="size-4" />
            Sesión suelta
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Vender sesión suelta</SheetTitle>
            <SheetDescription>
              Registrá una sesión individual, sin paquete asociado.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-4 px-4 pb-4">
            <SellLooseSessionForm
              action={boundSellLoose}
              templates={templates}
              onSuccess={() => setLooseOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
