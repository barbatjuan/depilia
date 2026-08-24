import { describe, expect, it } from "vitest";
import { buildDashboardKpis } from "@/features/dashboard/domain/kpis";

describe("buildDashboardKpis", () => {
  it("aggregates raw counts/sums into the five required KPIs", () => {
    const kpis = buildDashboardKpis({
      todayAppointmentsCount: 3,
      monthPayments: [{ amount: 50000 }, { amount: 25000 }],
      activeClientsCount: 12,
      upcoming7DaysCount: 8,
      lowSessionPackagesCount: 2,
    });

    expect(kpis).toEqual({
      todayAppointments: 3,
      monthRevenue: 75000,
      activeClients: 12,
      upcoming7Days: 8,
      lowSessionPackages: 2,
    });
  });

  it("returns all-zero KPIs on empty seed data (correct empty state, not a placeholder)", () => {
    const kpis = buildDashboardKpis({
      todayAppointmentsCount: 0,
      monthPayments: [],
      activeClientsCount: 0,
      upcoming7DaysCount: 0,
      lowSessionPackagesCount: 0,
    });

    expect(kpis).toEqual({
      todayAppointments: 0,
      monthRevenue: 0,
      activeClients: 0,
      upcoming7Days: 0,
      lowSessionPackages: 0,
    });
  });
});
