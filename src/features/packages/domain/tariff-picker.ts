import type {
  Gender,
  PackageTemplateOption,
  SizeCategory,
} from "@/features/packages/domain/sell-package";

/** Display labels for the gender segmented control in the sell flows. */
export const GENDER_LABEL: Record<Gender, string> = {
  mujer: "Mujer",
  hombre: "Hombre",
};

/** Display labels for each `size_category`, used as Select group headers. */
export const SIZE_LABEL: Record<SizeCategory, string> = {
  mini: "Mini",
  pequena: "Pequeña",
  mediana: "Mediana",
  grande: "Grande",
  cuerpo: "Cuerpo",
};

/** Canonical ordering of the size categories, smallest area first. */
export const SIZE_ORDER: SizeCategory[] = [
  "mini",
  "pequena",
  "mediana",
  "grande",
  "cuerpo",
];

/**
 * Pure filter for the tariff picker (spec service-catalog R7/R8): the sell
 * flows always scope the visible tariffs to one gender, optionally to one
 * size category. Gender-specific areas (`Ingles Completas` mujer-only,
 * `Perfilado de barba` hombre-only) simply have no row for the other gender,
 * so this predicate drops them for free.
 */
export function filterTariffs(
  tariffs: PackageTemplateOption[],
  filters: { gender: Gender; sizeCategory?: SizeCategory },
): PackageTemplateOption[] {
  return tariffs.filter(
    (t) =>
      t.gender === filters.gender &&
      (filters.sizeCategory === undefined ||
        t.sizeCategory === filters.sizeCategory),
  );
}

export type TariffGroup = {
  sizeCategory: SizeCategory;
  label: string;
  tariffs: PackageTemplateOption[];
};

/**
 * Groups tariffs by `size_category` in canonical `SIZE_ORDER`, dropping any
 * size with no tariffs. Feeds the size-grouped Select in the sell forms.
 */
export function groupTariffsBySize(
  tariffs: PackageTemplateOption[],
): TariffGroup[] {
  return SIZE_ORDER.map((sizeCategory) => ({
    sizeCategory,
    label: SIZE_LABEL[sizeCategory],
    tariffs: tariffs.filter((t) => t.sizeCategory === sizeCategory),
  })).filter((group) => group.tariffs.length > 0);
}
