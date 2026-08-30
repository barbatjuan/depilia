import {
  Calendar,
  CalendarClock,
  TrendingUp,
  TriangleAlert,
  Users,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatMoney } from "@/lib/money";
import { getMoneyFormat } from "@/features/settings/data/money-format";
import { getDashboardKpis } from "@/features/dashboard/data/get-kpis";
import { getTodaySchedule } from "@/features/dashboard/data/get-today-schedule";
import { getWeekSchedule } from "@/features/dashboard/data/get-week-schedule";
import { KpiCard } from "@/components/kpi-card";
import { TodayScheduleWidget } from "@/features/dashboard/components/today-schedule-widget";
import { WeekScheduleWidget } from "@/features/dashboard/components/week-schedule-widget";

const todayLabel = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

export default async function DashboardPage() {
  const supabase = await createClient();
  const moneyFormat = await getMoneyFormat(supabase);
  const [kpis, todaySchedule, weekSchedule] = await Promise.all([
    getDashboardKpis(supabase),
    getTodaySchedule(supabase),
    getWeekSchedule(supabase),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground capitalize">
          {todayLabel}
        </p>
      </div>

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Resumen
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KpiCard
            label="Turnos hoy"
            value={kpis.todayAppointments}
            icon={Calendar}
          />
          <KpiCard
            label="Ingresos del mes"
            value={formatMoney(kpis.monthRevenue, moneyFormat)}
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

      <div>
        <h2 className="mb-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Agenda
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayScheduleWidget appointments={todaySchedule} />
          <WeekScheduleWidget week={weekSchedule} />
        </div>
      </div>
    </div>
  );
}
