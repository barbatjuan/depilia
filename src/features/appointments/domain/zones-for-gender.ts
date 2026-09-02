export type GenderedZone = { id: string; name: string; gender: string };
export type ZoneOption = { id: string; name: string };

/**
 * The body zones the catalog offers for a given gender, deduped by id and
 * sorted by name. Backs the booking form's gender → zone dependent selects
 * so staff can't pick a zone with no tariff for that gender.
 */
export function zonesForGender(
  zones: GenderedZone[],
  gender: string,
): ZoneOption[] {
  const byId = new Map<string, ZoneOption>();
  for (const zone of zones) {
    if (zone.gender === gender && !byId.has(zone.id)) {
      byId.set(zone.id, { id: zone.id, name: zone.name });
    }
  }
  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
}
