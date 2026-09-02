import { toZonedTime } from "date-fns-tz";
import { CLINIC_TZ, monthKey as toMonthKey } from "./period";

const WEEKDAY_LABEL = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export type ZoneCount = { zoneName: string; count: number };
export type WeekdayRevenue = { weekday: string; total: number };
export type HourRevenue = { hour: number; total: number };

export type BusinessMetrics = {
  cancelRate: number;
  noShowRate: number;
  topZones: ZoneCount[];
  newClients: number;
  returningClients: number;
  revenueByWeekday: WeekdayRevenue[];
  revenueByHour: HourRevenue[];
};

/** Percent change, `null` when there is nothing to compare against. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 1000) / 10;
}

/**
 * Business-health metrics for the monthly report (spec: PASO 5.2). `monthKey`
 * decides "new" vs "returning": a client is new when their all-time first
 * sale (`clientsFirstSale`) falls in this same month, returning otherwise.
 * Revenue-by-weekday/hour use `sales.soldAt` (devengado), matching the IVA
 * section's basis rather than payments.
 */
export function buildBusinessMetrics({
  monthKey,
  appointments,
  sales,
  clientsFirstSale,
}: {
  monthKey: string;
  appointments: { status: string; zoneName: string }[];
  sales: { clientId: string; total: number; soldAt: string }[];
  clientsFirstSale: { clientId: string; firstSaleAt: string }[];
}): BusinessMetrics {
  const totalAppointments = appointments.length;
  const cancelled = appointments.filter((a) => a.status === "cancelled").length;
  const noShow = appointments.filter((a) => a.status === "no_show").length;

  const cancelRate =
    totalAppointments === 0 ? 0 : Math.round((cancelled / totalAppointments) * 1000) / 10;
  const noShowRate =
    totalAppointments === 0 ? 0 : Math.round((noShow / totalAppointments) * 1000) / 10;

  const zoneCounts = new Map<string, number>();
  for (const appointment of appointments) {
    zoneCounts.set(appointment.zoneName, (zoneCounts.get(appointment.zoneName) ?? 0) + 1);
  }
  const topZones = [...zoneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([zoneName, count]) => ({ zoneName, count }));

  const firstSaleByClient = new Map(
    clientsFirstSale.map((c) => [c.clientId, c.firstSaleAt]),
  );
  const clientsInMonth = new Set(sales.map((s) => s.clientId));
  let newClients = 0;
  let returningClients = 0;
  for (const clientId of clientsInMonth) {
    const firstSaleAt = firstSaleByClient.get(clientId);
    if (firstSaleAt && toMonthKey(new Date(firstSaleAt)) === monthKey) {
      newClients += 1;
    } else {
      returningClients += 1;
    }
  }

  const weekdayTotals = new Map<number, number>();
  const hourTotals = new Map<number, number>();
  for (const sale of sales) {
    const zoned = toZonedTime(new Date(sale.soldAt), CLINIC_TZ);
    const weekday = zoned.getDay();
    const hour = zoned.getHours();
    weekdayTotals.set(weekday, (weekdayTotals.get(weekday) ?? 0) + sale.total);
    hourTotals.set(hour, (hourTotals.get(hour) ?? 0) + sale.total);
  }

  return {
    cancelRate,
    noShowRate,
    topZones,
    newClients,
    returningClients,
    revenueByWeekday: WEEKDAY_LABEL.map((weekday, i) => ({
      weekday,
      total: weekdayTotals.get(i) ?? 0,
    })),
    revenueByHour: Array.from({ length: 24 }, (_, hour) => ({
      hour,
      total: hourTotals.get(hour) ?? 0,
    })),
  };
}
