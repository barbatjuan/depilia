export type RecoveryBucket = "green" | "yellow" | "red";

export type RecoveryClientInput = {
  clientId: string;
  name: string;
  phone: string | null;
  lastVisit: string | null;
};

export type RecoveryClientRow = {
  clientId: string;
  name: string;
  phone: string | null;
  lastVisit: string;
  daysSince: number;
  bucket: RecoveryBucket;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Clientes a recuperar" (Fase 1, spec: recovery screen). `null` (never
 * visited) is not a bucket — "recuperar" implies they came before.
 */
export function bucketForLastVisit(
  lastVisit: string | null,
  now: Date,
): RecoveryBucket | null {
  if (lastVisit === null) return null;
  const daysSince = Math.floor((now.getTime() - new Date(lastVisit).getTime()) / DAY_MS);
  if (daysSince <= 45) return "green";
  if (daysSince <= 90) return "yellow";
  return "red";
}

/** Filters out never-visited clients, buckets the rest, most-overdue first. */
export function buildRecoveryList(
  rows: RecoveryClientInput[],
  now: Date,
): RecoveryClientRow[] {
  return rows
    .filter((row): row is RecoveryClientInput & { lastVisit: string } => row.lastVisit !== null)
    .map((row) => ({
      clientId: row.clientId,
      name: row.name,
      phone: row.phone,
      lastVisit: row.lastVisit,
      daysSince: Math.floor((now.getTime() - new Date(row.lastVisit).getTime()) / DAY_MS),
      bucket: bucketForLastVisit(row.lastVisit, now)!,
    }))
    .sort((a, b) => b.daysSince - a.daysSince);
}
