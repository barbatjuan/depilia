const DEFAULT_SLOT = "09:00";

function hhmm(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Every 15-minute slot from `startHour` (inclusive) to `endHour` (exclusive),
 * as `"HH:mm"`. Backs the booking form's time picker — no free-typed odd
 * minutes.
 */
export function quarterHourSlots(startHour: number, endHour: number): string[] {
  const slots: string[] = [];
  for (let m = startHour * 60; m < endHour * 60; m += 15) {
    slots.push(hhmm(m));
  }
  return slots;
}

/** Rounds a `"HH:mm"` string to the nearest quarter hour; `DEFAULT_SLOT` on junk. */
export function snapToQuarter(time: string): string {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return DEFAULT_SLOT;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return DEFAULT_SLOT;
  return hhmm(Math.round((hours * 60 + minutes) / 15) * 15);
}
