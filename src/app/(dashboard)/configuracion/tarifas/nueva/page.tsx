import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { listActiveBodyZones } from "@/features/packages/data/package-templates";
import { TarifaForm } from "@/features/settings/components/tarifa-form";
import { createTarifaAction } from "@/features/settings/actions/create-tarifa";

export default async function NuevaTarifaPage() {
  const supabase = await createClient();
  const zones = await listActiveBodyZones(supabase);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Nueva tarifa</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>Datos de la tarifa</CardTitle>
        </CardHeader>
        <CardContent>
          <TarifaForm
            action={createTarifaAction}
            submitLabel="Crear tarifa"
            zones={zones.map((z) => z.name)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
