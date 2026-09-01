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

const optionalDiscountKind = z
  .union([z.literal(""), z.enum(["percent", "fixed"])])
  .nullish()
  .transform((value) => value ?? "");
const optionalText = z
  .string()
  .nullish()
  .transform((value) => (value ?? "").trim());

/**
 * Optional per-sale manual discount fields, shared by the "vender paquete"
 * and "sesión suelta" schemas (spec: "sale-discounts / Manual discount at
 * both flows"). A discount is "applied" when `discountValue` is a positive
 * number; when it is, a `discountReason` is required and the value must be a
 * valid percent (0 < v <= 100) or a positive fixed amount.
 *
 * NOTE (P3): the discount-code input lands here as a `discountCode` field and
 * becomes mutually exclusive with these manual fields — the XOR guard is
 * wired in P3, this slice only ships the manual path.
 */
export const discountFields = {
  discountKind: optionalDiscountKind,
  discountValue: optionalNumeric,
  discountReason: optionalText,
};

type DiscountShape = {
  discountKind: "" | "percent" | "fixed";
  discountValue: "" | number;
  discountReason: string;
};

export function refineManualDiscount(
  data: DiscountShape,
  ctx: z.RefinementCtx,
): void {
  const value = typeof data.discountValue === "number" ? data.discountValue : 0;
  const applying = data.discountKind !== "" || value > 0;
  if (!applying) return;

  if (data.discountKind !== "percent" && data.discountKind !== "fixed") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountKind"],
      message: "Elegí el tipo de descuento.",
    });
  }
  if (data.discountReason === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountReason"],
      message: "Ingresá el motivo del descuento.",
    });
  }
  if (data.discountKind === "percent" && (value <= 0 || value > 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "El porcentaje debe estar entre 0 y 100.",
    });
  }
  if (data.discountKind === "fixed" && value <= 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["discountValue"],
      message: "El descuento debe ser mayor a 0.",
    });
  }
}

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
    ...discountFields,
  })
  .superRefine((data, ctx) => {
    refineManualDiscount(data, ctx);
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
export const sellLooseSessionSchema = z
  .object({
    clientId: uuid,
    templateId: uuid,
    amount: optionalNumeric.transform((value) =>
      value === "" ? null : (value as number),
    ),
    ...discountFields,
  })
  .superRefine(refineManualDiscount);

export type SellLooseSessionInput = z.infer<typeof sellLooseSessionSchema>;
