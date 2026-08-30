import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { listTariffs } from "@/features/settings/data/tarifas";
import { TarifaList } from "@/features/settings/components/tarifa-list";
import { GENDER_LABEL } from "@/features/packages/domain/tariff-picker";
import { TARIFA_GENDERS, type TarifaGender } from "@/features/settings/schema";

function resolveGender(value: string | undefined): TarifaGender {
  return value === "hombre" ? "hombre" : "mujer";
}

export default async function TarifasPage({
  searchParams,
}: {
  searchParams: Promise<{ gender?: string; archived?: string }>;
}) {
  const sp = await searchParams;
  const gender = resolveGender(sp.gender);
  const includeArchived = sp.archived === "1";

  const supabase = await createClient();
  const rows = await listTariffs(supabase, { gender, includeArchived });

  const archivedQuery = includeArchived ? "" : "&archived=1";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarifas</h1>
          <p className="text-sm text-muted-foreground">
            Precios por sesión y por bono de 6 sesiones, por zona y género.
          </p>
        </div>
        <Button asChild>
          <Link href="/configuracion/tarifas/nueva">Agregar tarifa</Link>
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {TARIFA_GENDERS.map((g) => (
            <Button
              key={g}
              asChild
              variant={gender === g ? "default" : "outline"}
              size="sm"
            >
              <Link
                href={`/configuracion/tarifas?gender=${g}${includeArchived ? "&archived=1" : ""}`}
                aria-current={gender === g ? "page" : undefined}
              >
                {GENDER_LABEL[g]}
              </Link>
            </Button>
          ))}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/configuracion/tarifas?gender=${gender}${archivedQuery}`}>
            {includeArchived ? "Ocultar archivadas" : "Mostrar archivadas"}
          </Link>
        </Button>
      </div>

      <TarifaList rows={rows} />
    </div>
  );
}
