"use client";

import { DataTable } from "@/components/data-table";
import { groupTariffsForList } from "@/features/settings/domain/tariff-list";
import { tarifaColumns } from "@/features/settings/components/tarifa-columns";
import type { TariffRow } from "@/features/settings/data/tarifas";

/**
 * Size-sectioned tariff list for `/configuracion/tarifas`. The gender filter
 * and the "show archived" toggle live in `searchParams` (handled by the RSC
 * page); this component only groups the already-filtered rows it receives.
 */
export function TarifaList({ rows }: { rows: TariffRow[] }) {
  const groups = groupTariffsForList(rows);

  if (groups.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay tarifas para este género.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => (
        <section key={group.sizeCategory} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h2>
          <DataTable columns={tarifaColumns} data={group.tariffs} />
        </section>
      ))}
    </div>
  );
}
