import {
  Calendar,
  CalendarClock,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDashboardKpis } from "@/features/dashboard/data/get-kpis";
import { KpiCard } from "@/components/kpi-card";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export default async function DashboardPage() {
  const supabase = await createClient();
  const kpis = await getDashboardKpis(supabase);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          label="Turnos hoy"
          value={kpis.todayAppointments}
          icon={Calendar}
        />
        <KpiCard
          label="Ingresos del mes"
          value={currencyFormatter.format(kpis.monthRevenue)}
          icon={TrendingUp}
        />
        <KpiCard
          label="Clientes activos"
          value={kpis.activeClients}
          icon={Users}
        />
        <KpiCard
          label="Próximos 7 días"
          value={kpis.upcoming7Days}
          icon={CalendarClock}
        />
        <KpiCard
          label="Paquetes por vencer"
          value={kpis.lowSessionPackages}
          icon={TriangleAlert}
        />
      </div>
    </div>
  );
}
