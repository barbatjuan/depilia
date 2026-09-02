import { z } from "zod";

/** Genders a tariff can target — mirrors `package_templates.gender`. */
export const TARIFA_GENDERS = ["mujer", "hombre"] as const;
export type TarifaGender = (typeof TARIFA_GENDERS)[number];

/** Size families — mirrors `package_templates.size_category`. */
export const TARIFA_SIZES = [
  "mini",
  "pequena",
  "mediana",
  "grande",
  "cuerpo",
] as const;
export type TarifaSize = (typeof TARIFA_SIZES)[number];

const positivePrice = z.coerce
  .number()
  .positive("El precio debe ser mayor a 0");

/** Default VAT rate (fraction) for a tariff with no `vatPercent` given — 21%. */
export const TARIFA_VAT_DEFAULT = 0.21;
const TARIFA_VAT_DEFAULT_PERCENT = 21;

const vatPercent = z.coerce
  .number()
  .min(0, "El IVA no puede ser negativo")
  .max(99.9, "El IVA no puede superar 99,9%")
  .default(TARIFA_VAT_DEFAULT_PERCENT);

/** `21` -> `0.21`; rounds to numeric(4,3) precision (one decimal on the %). */
function percentToRate(percent: number): number {
  return Math.round(percent * 10) / 1000;
}

/**
 * "Nueva tarifa" schema (spec service-catalog R4). The zone is chosen by name
 * via a combobox: an existing `body_zones.name` OR a brand-new one that the
 * create action inserts before the `package_templates` row. `defaultSessions`
 * is always 6 (every bono is a 6-session bono) but stays overridable.
 * `vatPercent` (0-99.9, whole price is VAT-inclusive) is transformed to the
 * `vatRate` fraction stored on `package_templates.vat_rate`.
 */
export const tariffSchema = z
  .object({
    zoneName: z.string().trim().min(1, "El nombre de la zona es obligatorio"),
    gender: z.enum(TARIFA_GENDERS, {
      errorMap: () => ({ message: "Elegí un género válido" }),
    }),
    sizeCategory: z.enum(TARIFA_SIZES, {
      errorMap: () => ({ message: "Elegí un tamaño válido" }),
    }),
    sessionPrice: positivePrice,
    bonoPrice: positivePrice,
    defaultSessions: z.coerce
      .number()
      .int()
      .positive()
      .default(6),
    vatPercent,
  })
  .transform(({ vatPercent, ...rest }) => ({
    ...rest,
    vatRate: percentToRate(vatPercent),
  }));

export type TariffInput = z.infer<typeof tariffSchema>;

/**
 * "Editar tarifa" schema. Gender and zone identify the row (the partial unique
 * index is on `(zone_id, gender)`), so they are NOT editable — to move a
 * tariff you archive it and create a new one. Size, prices and IVA change here.
 */
export const tariffUpdateSchema = z
  .object({
    sizeCategory: z.enum(TARIFA_SIZES, {
      errorMap: () => ({ message: "Elegí un tamaño válido" }),
    }),
    sessionPrice: positivePrice,
    bonoPrice: positivePrice,
    vatPercent,
  })
  .transform(({ vatPercent, ...rest }) => ({
    ...rest,
    vatRate: percentToRate(vatPercent),
  }));

export type TariffUpdateInput = z.infer<typeof tariffUpdateSchema>;
