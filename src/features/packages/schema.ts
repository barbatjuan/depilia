import { z } from "zod";

const uuid = z.string().uuid();
const optionalUuid = z.union([z.literal(""), uuid]).optional().default("");
const optionalNumeric = z
  .union([z.literal(""), z.coerce.number()])
  .optional()
  .default("");

/**
 * "Sell a package" form/action schema (spec: "package-sessions / Sell a
 * package"). The admin either picks a catalog `package_template` OR fills
 * in an ad-hoc zone + session count + price — `.superRefine` enforces that
 * exactly one complete path is provided, shared by the client-side form and
 * the server action (the real validation boundary).
 */
export const sellPackageSchema = z
  .object({
    clientId: uuid,
    templateId: optionalUuid,
    zoneId: optionalUuid,
    sessionCount: optionalNumeric,
    price: optionalNumeric,
  })
  .superRefine((data, ctx) => {
    const hasTemplate = data.templateId !== "";
    const hasCustom =
      data.zoneId !== "" && data.sessionCount !== "" && data.price !== "";

    if (!hasTemplate && !hasCustom) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          "Elegí un paquete del catálogo o completá zona, sesiones y precio.",
      });
      return;
    }

    if (!hasTemplate) {
      if (
        typeof data.sessionCount === "number" &&
        (!Number.isInteger(data.sessionCount) || data.sessionCount <= 0)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sessionCount"],
          message: "La cantidad de sesiones debe ser un entero mayor a 0",
        });
      }
      if (typeof data.price === "number" && data.price <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["price"],
          message: "El precio debe ser mayor a 0",
        });
      }
    }
  });

export type SellPackageInput = z.infer<typeof sellPackageSchema>;

/**
 * "Sell a loose session" form/action schema (spec: "package-sessions / Sell
 * a loose session"). No template, no session count — just a client, a zone,
 * and a price for a single one-off session.
 */
export const sellLooseSessionSchema = z.object({
  clientId: uuid,
  zoneId: uuid,
  price: z.coerce.number().positive("El precio debe ser mayor a 0"),
});

export type SellLooseSessionInput = z.infer<typeof sellLooseSessionSchema>;
