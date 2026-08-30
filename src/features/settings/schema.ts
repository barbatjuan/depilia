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

/**
 * "Nueva tarifa" schema (spec service-catalog R4). The zone is chosen by name
 * via a combobox: an existing `body_zones.name` OR a brand-new one that the
 * create action inserts before the `package_templates` row. `defaultSessions`
 * is always 6 (every bono is a 6-session bono) but stays overridable.
 */
export const tariffSchema = z.object({
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
});

export type TariffInput = z.infer<typeof tariffSchema>;

/**
 * "Editar tarifa" schema. Gender and zone identify the row (the partial unique
 * index is on `(zone_id, gender)`), so they are NOT editable — to move a
 * tariff you archive it and create a new one. Only size + prices change here.
 */
export const tariffUpdateSchema = z.object({
  sizeCategory: z.enum(TARIFA_SIZES, {
    errorMap: () => ({ message: "Elegí un tamaño válido" }),
  }),
  sessionPrice: positivePrice,
  bonoPrice: positivePrice,
});

export type TariffUpdateInput = z.infer<typeof tariffUpdateSchema>;
