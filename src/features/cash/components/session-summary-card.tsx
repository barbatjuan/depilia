import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { CashSessionRow } from "@/features/cash/data/cash-session";
import type { TheoreticalRow } from "@/features/cash/data/cash-balance";
import { deriveArqueo } from "@/features/cash/domain/arqueo";
import { ArqueoBadge } from "@/features/cash/components/arqueo-badge";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
});

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

/**
 * The cash session at a glance (spec: "cash-register / Theoretical balance
 * derivation" + "Closing arqueo"). For an open session it shows the live
 * theoretical breakdown from the `cash_session_theoretical` view; for a
 * closed one it shows the immutable arqueo snapshot.
 */
export function SessionSummaryCard({
  session,
  theoretical,
}: {
  session: CashSessionRow;
  theoretical: TheoreticalRow | null;
}) {
  const isOpen = session.status === "open";
  const arqueo =
    session.countedAmount !== null && session.theoreticalAmount !== null
      ? deriveArqueo(session.countedAmount, session.theoreticalAmount)
      : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Caja del {dateFormatter.format(new Date(`${session.businessDate}T12:00:00Z`))}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {isOpen ? "Abierta" : "Cerrada"}
          </span>
        </CardTitle>
        <CardDescription>
          {isOpen
            ? "Balance teórico en vivo del cajón"
            : "Arqueo final — valores congelados al cierre"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Line
          label="Apertura"
          value={currencyFormatter.format(session.openingAmount)}
        />
        {isOpen && theoretical ? (
          <>
            <Line
              label="Cobros en efectivo"
              value={currencyFormatter.format(theoretical.cashPayments)}
            />
            <Line
              label="Movimientos"
              value={currencyFormatter.format(theoretical.movementsNet)}
            />
            <Line
              label="Gastos en efectivo"
              value={`-${currencyFormatter.format(theoretical.cashExpenses)}`}
            />
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              <span className="font-medium">Teórico</span>
              <span className="text-lg font-semibold tabular-nums">
                {currencyFormatter.format(theoretical.theoretical)}
              </span>
            </div>
          </>
        ) : null}
        {!isOpen && arqueo ? (
          <>
            <Line
              label="Teórico"
              value={currencyFormatter.format(session.theoreticalAmount ?? 0)}
            />
            <Line
              label="Contado"
              value={currencyFormatter.format(session.countedAmount ?? 0)}
            />
            <div className="mt-2 flex items-center justify-between border-t pt-2 text-sm">
              <span className="font-medium">Resultado</span>
              <ArqueoBadge status={arqueo.status} difference={arqueo.difference} />
            </div>
            {session.closingNote ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {session.closingNote}
              </p>
            ) : null}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
