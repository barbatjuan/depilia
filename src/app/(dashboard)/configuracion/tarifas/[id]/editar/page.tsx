import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { getTariff } from "@/features/settings/data/tarifas";
import { TarifaForm } from "@/features/settings/components/tarifa-form";
import { updateTarifaAction } from "@/features/settings/actions/update-tarifa";
import { GENDER_LABEL } from "@/features/packages/domain/tariff-picker";

export default async function EditarTarifaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const tarifa = await getTariff(supabase, id);
  if (!tarifa) notFound();

  const boundAction = updateTarifaAction.bind(null, id);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar tarifa</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>
            {tarifa.zoneName} · {GENDER_LABEL[tarifa.gender]}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TarifaForm
            action={boundAction}
            submitLabel="Guardar cambios"
            tarifa={tarifa}
          />
        </CardContent>
      </Card>
    </div>
  );
}
