import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoneyCell } from "@/components/money-cell";
import { ArchiveTarifaButton } from "@/features/settings/components/archive-tarifa-button";
import type { TariffRow } from "@/features/settings/data/tarifas";

export const tarifaColumns: ColumnDef<TariffRow>[] = [
  {
    id: "zone",
    header: "Zona",
    cell: ({ row }) => row.original.zoneName,
  },
  {
    id: "sessionPrice",
    header: "Sesión",
    cell: ({ row }) => <MoneyCell amount={row.original.sessionPrice} />,
  },
  {
    id: "bonoPrice",
    header: "Bono (6 sesiones)",
    cell: ({ row }) => <MoneyCell amount={row.original.bonoPrice} />,
  },
  {
    id: "status",
    header: "Estado",
    cell: ({ row }) =>
      row.original.active ? (
        <Badge variant="secondary">Activa</Badge>
      ) : (
        <Badge variant="outline">Archivada</Badge>
      ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/configuracion/tarifas/${row.original.id}/editar`}>
            Editar
          </Link>
        </Button>
        <ArchiveTarifaButton
          id={row.original.id}
          active={row.original.active}
        />
      </div>
    ),
  },
];
