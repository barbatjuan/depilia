export type ClientPackageRow = {
  id: string;
  zoneId: string;
  zoneName: string;
  totalSessions: number;
  sessionsUsed: number;
  createdAt: string;
};

export type ClientPackageSummary = ClientPackageRow & {
  remaining: number;
  status: "active" | "completed";
};

/**
 * Pure per-zone remaining-sessions computation for the client ficha (spec:
 * "client-management / Ficha shows session balances"). Mirrors the
 * `client_package_remaining` SQL view's formula (`total_sessions -
 * sessions_used`) so the UI and the DB invariant never disagree.
 */
export function summarizeClientPackages(
  packages: ClientPackageRow[],
): ClientPackageSummary[] {
  return packages.map((pkg) => {
    const remaining = pkg.totalSessions - pkg.sessionsUsed;
    return {
      ...pkg,
      remaining,
      status: remaining > 0 ? "active" : "completed",
    };
  });
}
