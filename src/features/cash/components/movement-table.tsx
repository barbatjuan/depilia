"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CashMovementRow } from "@/features/cash/data/cash-movements";
import { signedAmount } from "@/features/cash/domain/movement";
import { formatMoney } from "@/lib/money";
import { useMoneyFormat } from "@/components/money-format-provider";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const KIND_LABEL: Record<string, string> = {
  retiro: "Retiro",
  ingreso: "Ingreso",
  ajuste: "Ajuste",
};

/**
 * Read-only list of a session's cash movements (spec: "cash-register / Cash
 * movements"). The signed contribution shown here uses the same `signedAmount`
 * expression as the theoretical view and the close trigger.
 */
export function MovementTable({ movements }: { movements: CashMovementRow[] }) {
  const moneyFormat = useMoneyFormat();
  if (movements.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no se registraron movimientos.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hora</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Motivo</TableHead>
          <TableHead className="text-right">Monto</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {movements.map((movement) => {
          const signed = signedAmount(movement);
          return (
            <TableRow key={movement.id}>
              <TableCell>
                {timeFormatter.format(new Date(movement.createdAt))}
              </TableCell>
              <TableCell>{KIND_LABEL[movement.kind] ?? movement.kind}</TableCell>
              <TableCell className="whitespace-normal">{movement.reason}</TableCell>
              <TableCell
                className={`text-right tabular-nums ${
                  signed < 0 ? "text-destructive" : ""
                }`}
              >
                {signed < 0 ? "-" : "+"}
                {formatMoney(Math.abs(signed), moneyFormat)}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
