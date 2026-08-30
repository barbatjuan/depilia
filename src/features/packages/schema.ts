import { z } from "zod";

const uuid = z.string().uuid();
// `.nullish()` (not `.optional()`) because the "sell a package" form only
// renders the `zoneId`/`sessionCount`/`price` hidden inputs when the admin
// picked the ad-hoc/custom path — when a catalog template is selected
// instead, those inputs are absent from the DOM entirely, so
// `formData.get(...)` returns `null`, not `undefined`. `.optional()` alone
// only tolerates `undefined` and rejects `null`, which made a real template
// sale fail schema validation (caught by the E2E golden path, not by any
// unit/integration test — those exercised the domain/data layers directly,
// never a real `FormData` built the way a browser actually builds one).
const optionalUuid = z
  .union([z.literal(""), uuid])
  .nullish()
  .transform((value) => value ?? "");
const optionalNumeric = z
  .union([z.literal(""), z.coerce.number()])
  .nullish()
  .transform((value) => value ?? "");

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
 * "Sell a loose session" form/action schema (spec: "service-catalog /
 * Selling a loose session with a tariff-prefilled price"). The operator
 * picks a tariff (`templateId`) which drives the prefilled amount; the
 * amount field stays editable, and a blank value falls back server-side to
 * the tariff's `session_price`.
 */
export const sellLooseSessionSchema = z.object({
  clientId: uuid,
  templateId: uuid,
  amount: optionalNumeric.transform((value) =>
    value === "" ? null : (value as number),
  ),
});

export type SellLooseSessionInput = z.infer<typeof sellLooseSessionSchema>;
