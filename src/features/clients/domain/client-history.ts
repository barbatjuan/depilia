export type ClientHistoryAppointment = {
  status: string;
  scheduledAt: string;
  zoneName: string;
};
export type ClientHistorySale = { total: number; soldAt: string };
export type ClientHistoryPayment = { amount: number; paidAt: string };
export type ClientHistoryPackage = { remaining: number };

export type FavouriteZone = { zone: string; count: number };

export type ClientHistorySummary = {
  lastVisit: string | null;
  nextVisit: string | null;
  totalSpent: number;
  visitCount: number;
  averageTicket: number;
  cancelledCount: number;
  noShowCount: number;
  favouriteZones: FavouriteZone[];
  activePackages: number;
  lifetimeMonths: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Ficha-de-cliente summary stats (spec: PASO 7). `totalSpent` is what the
 * client actually paid (cobrado), not what they were billed — same basis as
 * the rest of the reporting. `visitCount`/`averageTicket` count completed
 * appointments, since a scheduled or cancelled turno was never a visit.
 */
export function summarizeClientHistory({
  appointments,
  sales,
  payments,
  packages,
  now = new Date(),
}: {
  appointments: ClientHistoryAppointment[];
  sales: ClientHistorySale[];
  payments: ClientHistoryPayment[];
  packages: ClientHistoryPackage[];
  now?: Date;
}): ClientHistorySummary {
  const completed = appointments.filter((a) => a.status === "completed");
  const cancelledCount = appointments.filter((a) => a.status === "cancelled").length;
  const noShowCount = appointments.filter((a) => a.status === "no_show").length;

  const past = appointments.filter(
    (a) => a.status !== "scheduled" && new Date(a.scheduledAt) <= now,
  );
  const future = appointments.filter(
    (a) => a.status === "scheduled" && new Date(a.scheduledAt) > now,
  );

  const lastVisit = past.length
    ? past.reduce((latest, a) => (a.scheduledAt > latest ? a.scheduledAt : latest), past[0]!.scheduledAt)
    : null;
  const nextVisit = future.length
    ? future.reduce((earliest, a) => (a.scheduledAt < earliest ? a.scheduledAt : earliest), future[0]!.scheduledAt)
    : null;

  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
  const visitCount = completed.length;
  const averageTicket = visitCount === 0 ? 0 : Math.round((totalSpent / visitCount) * 100) / 100;

  const zoneCounts = new Map<string, number>();
  for (const appointment of appointments) {
    zoneCounts.set(appointment.zoneName, (zoneCounts.get(appointment.zoneName) ?? 0) + 1);
  }
  const favouriteZones = [...zoneCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([zone, count]) => ({ zone, count }));

  const activePackages = packages.filter((p) => p.remaining > 0).length;

  const firstSaleAt = sales.reduce<string | null>(
    (earliest, s) => (earliest === null || s.soldAt < earliest ? s.soldAt : earliest),
    null,
  );
  const lifetimeMonths = firstSaleAt
    ? Math.max(0, Math.round((now.getTime() - new Date(firstSaleAt).getTime()) / (30 * DAY_MS)))
    : 0;

  return {
    lastVisit,
    nextVisit,
    totalSpent,
    visitCount,
    averageTicket,
    cancelledCount,
    noShowCount,
    favouriteZones,
    activePackages,
    lifetimeMonths,
  };
}

export type TimelineEntryType = "sale" | "payment" | "appointment";

export type TimelineEntry = {
  type: TimelineEntryType;
  at: string;
  label: string;
  amount?: number;
  status?: string;
};

/** Merges sales, payments and appointments into one chronological (desc) feed. */
export function buildClientTimeline({
  sales,
  payments,
  appointments,
}: {
  sales: { description: string; total: number; soldAt: string }[];
  payments: { amount: number; paidAt: string; method: string }[];
  appointments: { zoneName: string; scheduledAt: string; status: string }[];
}): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    ...sales.map((s) => ({
      type: "sale" as const,
      at: s.soldAt,
      label: s.description,
      amount: s.total,
    })),
    ...payments.map((p) => ({
      type: "payment" as const,
      at: p.paidAt,
      label: `Pago (${p.method})`,
      amount: p.amount,
    })),
    ...appointments.map((a) => ({
      type: "appointment" as const,
      at: a.scheduledAt,
      label: a.zoneName,
      status: a.status,
    })),
  ];

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}
