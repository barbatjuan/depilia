import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { getSale } from "@/features/sales/data/sales";
import { splitVat } from "@/features/accounting/domain/vat";
import { currencyFractionDigits } from "@/features/promotions/domain/discount";
import { registerPaymentAction } from "@/features/sales/actions/register-payment";
import { RegisterPaymentForm } from "@/features/sales/components/register-payment-form";
import { SaleStatusBadge } from "@/features/sales/components/sale-status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const dateFormatter = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  dateStyle: "medium",
  timeStyle: "short",
});

const METHOD_LABEL: Record<string, string> = {
  cash: "Efectivo",
  card: "Tarjeta",
  transfer: "Transferencia",
  other: "Otro",
};

export default async function SaleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const [sale, moneyFormat] = await Promise.all([
    getSale(supabase, id),
    getMoneyFormat(supabase),
  ]);
  if (!sale) notFound();
  const currencyFormat = (n: number) => formatMoney(n, moneyFormat);
  const vatSplit = splitVat(
    sale.balance.total,
    sale.vatRate,
    currencyFractionDigits(moneyFormat.currency),
  );

  const boundRegisterPayment = registerPaymentAction.bind(null, sale.id);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link href="/ventas">
            <ArrowLeft className="size-4" />
            Volver a ventas
          </Link>
        </Button>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              {sale.description}
            </h1>
            <Link
              href={`/clientes/${sale.clientId}`}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {sale.clientName}
            </Link>
          </div>
          <SaleStatusBadge status={sale.balance.status} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
          <CardDescription>
            Vendido el {dateFormatter.format(new Date(sale.soldAt))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {sale.discount.promotionName ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Promoción
                </p>
                <p className="text-lg font-semibold">
                  {sale.discount.promotionName}
                </p>
              </div>
            ) : null}
            {sale.discount.discountAmount > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Precio de lista
                </p>
                <p className="text-lg font-semibold line-through text-muted-foreground">
                  {currencyFormat(sale.discount.listTotal)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground uppercase">Total</p>
              <p className="text-lg font-semibold">
                {currencyFormat(sale.balance.total)}
              </p>
            </div>
            {sale.discount.discountAmount > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase">
                  Descuento
                </p>
                <p className="text-lg font-semibold">
                  −{currencyFormat(sale.discount.discountAmount)}
                </p>
                {sale.discount.discountReason || sale.discount.discountSource ? (
                  <p className="text-sm text-muted-foreground">
                    {[sale.discount.discountSource, sale.discount.discountReason]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ) : null}
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground uppercase">
                Pagado
              </p>
              <p className="text-lg font-semibold">
                {currencyFormat(sale.balance.paid)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase">Saldo</p>
              <p className="text-lg font-semibold">
                {currencyFormat(sale.balance.balance)}
              </p>
            </div>
            {sale.vatRate === 0 ? (
              <div>
                <p className="text-xs text-muted-foreground uppercase">IVA</p>
                <p className="text-lg font-semibold">Exento de IVA</p>
              </div>
            ) : (
              <>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    Base imponible
                  </p>
                  <p className="text-lg font-semibold">
                    {currencyFormat(vatSplit.net)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground uppercase">
                    IVA ({Math.round(sale.vatRate * 1000) / 10}%)
                  </p>
                  <p className="text-lg font-semibold">
                    {currencyFormat(vatSplit.vat)}
                  </p>
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de pagos</CardTitle>
          <CardDescription>
            Cada cuota registrada para esta venta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sale.payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Todavía no se registraron pagos.
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {sale.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <p className="font-medium">
                      {currencyFormat(payment.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {dateFormatter.format(new Date(payment.paidAt))} —{" "}
                      {METHOD_LABEL[payment.method] ?? payment.method}
                      {payment.note ? ` · ${payment.note}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {sale.balance.status !== "paid" ? (
        <Card>
          <CardHeader>
            <CardTitle>Registrar pago</CardTitle>
            <CardDescription>
              Saldo pendiente: {currencyFormat(sale.balance.balance)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RegisterPaymentForm action={boundRegisterPayment} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
