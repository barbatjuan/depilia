export type RecurrenceStatus = "due" | "overdue";

export type ZoneRecurrenceInput = {
  clientId: string;
  clientName: string;
  phone: string | null;
  zoneId: string;
  zoneName: string;
  recommendedWeeks: number;
  remainingSessions: number;
  /** Last completed session of THIS package. `null` = bought, never came. */
  lastSessionAt: string | null;
  /** Fallback reference date when `lastSessionAt` is `null`. */
  packageCreatedAt: string;
  /** A future session is already booked on this package. */
  hasUpcomingSession: boolean;
};

export type ZoneRecurrenceRow = {
  clientId: string;
  clientName: string;
  phone: string | null;
  zoneId: string;
  zoneName: string;
  remainingSessions: number;
  /** Last completed session in this zone, or `null` if the bono was bought
   * and never used — the UI copy differs between the two. */
  lastSessionAt: string | null;
  /** The date the overdue clock counts from (last session, or purchase). */
  since: string;
  weeksSince: number;
  weeksOverdue: number;
  status: RecurrenceStatus;
};

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * "Recontacto por zona" (Fase 1). A client with an active bono who is past
 * their zone's recommended cadence: inside the interval is silent, one-to-two
 * intervals out is "due", beyond two is "overdue".
 */
export function recurrenceStatus(
  weeksSince: number,
  recommendedWeeks: number,
): RecurrenceStatus | null {
  if (weeksSince < recommendedWeeks) return null;
  if (weeksSince < recommendedWeeks * 2) return "due";
  return "overdue";
}

/**
 * Drops packages with a session already booked and those still on cadence,
 * then orders the rest by weeks overdue so a short-interval zone that slipped
 * outranks a long-interval zone that is only just due.
 */
export function buildRecurrenceList(
  rows: ZoneRecurrenceInput[],
  now: Date,
): ZoneRecurrenceRow[] {
  return rows
    .filter((row) => !row.hasUpcomingSession)
    .flatMap((row) => {
      const since = row.lastSessionAt ?? row.packageCreatedAt;
      const weeksSince = Math.floor(
        (now.getTime() - new Date(since).getTime()) / WEEK_MS,
      );
      const status = recurrenceStatus(weeksSince, row.recommendedWeeks);
      if (status === null) return [];
      return [
        {
          clientId: row.clientId,
          clientName: row.clientName,
          phone: row.phone,
          zoneId: row.zoneId,
          zoneName: row.zoneName,
          remainingSessions: row.remainingSessions,
          lastSessionAt: row.lastSessionAt,
          since,
          weeksSince,
          weeksOverdue: weeksSince - row.recommendedWeeks,
          status,
        },
      ];
    })
    .sort((a, b) => b.weeksOverdue - a.weeksOverdue || b.weeksSince - a.weeksSince);
}
