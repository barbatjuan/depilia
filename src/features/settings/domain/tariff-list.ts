import type { SizeCategory } from "@/features/packages/domain/sell-package";
import {
  SIZE_LABEL,
  SIZE_ORDER,
} from "@/features/packages/domain/tariff-picker";

export type TariffSizeGroup<T> = {
  sizeCategory: SizeCategory;
  label: string;
  tariffs: T[];
};

/**
 * Groups tariff rows by `size_category` in canonical `SIZE_ORDER`, dropping
 * any size with no rows. Feeds the size-sectioned list on
 * `/configuracion/tarifas` (spec service-catalog R4). Reuses the ordering and
 * labels from the sell-flow picker so both surfaces stay in lockstep.
 */
export function groupTariffsForList<T extends { sizeCategory: SizeCategory }>(
  rows: T[],
): TariffSizeGroup<T>[] {
  return SIZE_ORDER.map((sizeCategory) => ({
    sizeCategory,
    label: SIZE_LABEL[sizeCategory],
    tariffs: rows.filter((row) => row.sizeCategory === sizeCategory),
  })).filter((group) => group.tariffs.length > 0);
}
