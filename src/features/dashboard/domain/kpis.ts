export type DashboardKpisInput = {
  todayAppointmentsCount: number;
  monthPayments: { amount: number }[];
  activeClientsCount: number;
  upcoming7DaysCount: number;
  lowSessionPackagesCount: number;
};

export type DashboardKpis = {
  todayAppointments: number;
  monthRevenue: number;
  activeClients: number;
  upcoming7Days: number;
  lowSessionPackages: number;
};

/**
 * Pure aggregation of the five KPIs the dashboard renders (spec:
 * "clinic-dashboard / KPI summary"). Takes already-fetched raw counts/rows
 * so it is testable without a database — the data layer owns the queries.
 */
export function buildDashboardKpis(
  input: DashboardKpisInput,
): DashboardKpis {
  return {
    todayAppointments: input.todayAppointmentsCount,
    monthRevenue: input.monthPayments.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    ),
    activeClients: input.activeClientsCount,
    upcoming7Days: input.upcoming7DaysCount,
    lowSessionPackages: input.lowSessionPackagesCount,
  };
}
