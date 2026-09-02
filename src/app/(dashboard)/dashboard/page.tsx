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
import { getRevenueSeries } from "@/features/dashboard/data/get-revenue-series";
import { getAppointmentsSeries } from "@/features/dashboard/data/get-appointments-series";
import { getPaymentMix } from "@/features/dashboard/data/get-payment-mix";
import { KpiCard } from "@/components/kpi-card";
import { TodayScheduleWidget } from "@/features/dashboard/components/today-schedule-widget";
import { WeekScheduleWidget } from "@/features/dashboard/components/week-schedule-widget";
import { RevenueChart } from "@/features/dashboard/components/charts/revenue-chart";
import { AppointmentsChart } from "@/features/dashboard/components/charts/appointments-chart";
import { PaymentMixChart } from "@/features/dashboard/components/charts/payment-mix-chart";
import { BookAppointmentSheet } from "@/features/appointments/components/book-appointment-sheet";
import { listClients } from "@/features/clients/data/clients";
import { listGenderedZones } from "@/features/packages/data/package-templates";
import { SectionLabel } from "@/components/section-label";

const todayLabel = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "long",
  day: "numeric",
  month: "long",
}).format(new Date());

export default async function DashboardPage() {
  const supabase = await createClient();
  const moneyFormat = await getMoneyFormat(supabase);
  const [
    kpis,
    todaySchedule,
    weekSchedule,
    revenueSeries,
    appointmentsSeries,
    paymentMix,
    clients,
    zones,
  ] = await Promise.all([
    getDashboardKpis(supabase),
    getTodaySchedule(supabase),
    getWeekSchedule(supabase),
    getRevenueSeries(supabase),
    getAppointmentsSeries(supabase),
    getPaymentMix(supabase),
    listClients(supabase),
    listGenderedZones(supabase),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground capitalize">
            {todayLabel}
          </p>
        </div>
        <BookAppointmentSheet clients={clients} zones={zones} />
      </div>

      <section>
        <SectionLabel>Resumen</SectionLabel>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-5">
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
            tone={kpis.lowSessionPackages > 0 ? "warning" : "default"}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Rendimiento</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          <RevenueChart data={revenueSeries} moneyFormat={moneyFormat} />
          <AppointmentsChart data={appointmentsSeries} />
          <PaymentMixChart data={paymentMix} moneyFormat={moneyFormat} />
        </div>
      </section>

      <section>
        <SectionLabel>Agenda</SectionLabel>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TodayScheduleWidget appointments={todaySchedule} />
          <WeekScheduleWidget week={weekSchedule} />
        </div>
      </section>
    </div>
  );
}
