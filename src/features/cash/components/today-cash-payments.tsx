"use client";

import Link from "next/link";
import type { TodayCashPayment } from "@/features/cash/data/cash-balance";
import { formatMoney } from "@/lib/money";
import { useMoneyFormat } from "@/components/money-format-provider";

const timeFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  timeStyle: "short",
});

/**
 * Read-only panel: today's cash payments feeding the theoretical balance
 * (design: "Cobros en efectivo de hoy" panel). Each row links to the sale it
 * belongs to. Card/transfer payments are filtered out upstream.
 */
export function TodayCashPayments({
  payments,
}: {
  payments: TodayCashPayment[];
}) {
  const moneyFormat = useMoneyFormat();
  if (payments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Todavía no hay cobros en efectivo hoy.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {payments.map((payment) => {
        const label =
          [payment.clientName, payment.saleDescription]
            .filter(Boolean)
            .join(" · ") || "Cobro en efectivo";
        return (
          <li
            key={payment.id}
            className="flex items-center justify-between rounded-md border p-3 text-sm"
          >
            <div>
              {payment.saleId ? (
                <Link
                  href={`/ventas/${payment.saleId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {label}
                </Link>
              ) : (
                <span className="font-medium">{label}</span>
              )}
              <p className="text-muted-foreground">
                {timeFormatter.format(new Date(payment.paidAt))}
                {payment.note ? ` · ${payment.note}` : ""}
              </p>
            </div>
            <span className="font-medium tabular-nums">
              {formatMoney(payment.amount, moneyFormat)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
