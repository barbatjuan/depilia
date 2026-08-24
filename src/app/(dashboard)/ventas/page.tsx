import { createClient } from "@/lib/supabase/server";
import { listSales } from "@/features/sales/data/sales";
import { SaleTable } from "@/features/sales/components/sale-table";

export default async function VentasPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const { clientId } = await searchParams;
  const supabase = await createClient();
  const sales = await listSales(supabase, { clientId });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ventas</h1>
        <p className="text-sm text-muted-foreground">
          {sales.length} venta{sales.length === 1 ? "" : "s"}
          {clientId ? " de este cliente" : ""}
        </p>
      </div>
      <SaleTable sales={sales} />
    </div>
  );
}
