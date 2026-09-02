"use server";

import { formatInTimeZone } from "date-fns-tz";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { sellPackageSchema } from "@/features/packages/schema";
import { buildPackageSalePayload } from "@/features/packages/domain/sell-package";
import { listActivePackageTemplates } from "@/features/packages/data/package-templates";
import { listActiveBonusPromotions } from "@/features/promotions/data/promotions";
import { sellPackage } from "@/features/packages/data/sell-package";
import { resolveDiscountInput } from "@/features/packages/data/sale-discount";
import { getDefaultVatRate } from "@/features/settings/data/vat";
import { mapDiscountError } from "@/features/promotions/domain/discount-errors";
import { PROMOTION_UNAVAILABLE_MESSAGE } from "@/features/promotions/domain/promotion-errors";
import { CLINIC_TZ } from "@/features/dashboard/domain/schedule";

export type SellPackageFormState = { error: string | null };

/**
 * Server action backing the "vender paquete" ficha form. Bound with the
 * client id via `.bind(null, clientId)`. Re-validates with
 * `sellPackageSchema` server-side (the real boundary), resolves either the
 * chosen catalog template or the ad-hoc zone/count/price into a payload,
 * then persists the `client_packages` + `sales` rows.
 */
export async function sellPackageAction(
  clientId: string,
  _prevState: SellPackageFormState,
  formData: FormData,
): Promise<SellPackageFormState> {
  const parsed = sellPackageSchema.safeParse({
    clientId,
    templateId: formData.get("templateId"),
    zoneId: formData.get("zoneId"),
    sessionCount: formData.get("sessionCount"),
    price: formData.get("price"),
    promotionId: formData.get("promotionId"),
    discountKind: formData.get("discountKind"),
    discountValue: formData.get("discountValue"),
    discountReason: formData.get("discountReason"),
    discountCode: formData.get("discountCode"),
  });

  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const message =
      flat.formErrors[0] ??
      Object.values(flat.fieldErrors)[0]?.[0] ??
      "Revisá los datos del paquete.";
    return { error: message };
  }

  const supabase = await createSupabaseClient();

  let discount;
  try {
    discount = await resolveDiscountInput(supabase, parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo aplicar el descuento.",
    };
  }

  let payload;
  try {
    if (parsed.data.promotionId) {
      const businessDate = formatInTimeZone(
        new Date(),
        CLINIC_TZ,
        "yyyy-MM-dd",
      );
      const promotions = await listActiveBonusPromotions(supabase, businessDate);
      const promotion = promotions.find(
        (p) => p.id === parsed.data.promotionId,
      );
      if (!promotion) {
        return { error: PROMOTION_UNAVAILABLE_MESSAGE };
      }
      payload = buildPackageSalePayload(
        {
          source: "promotion",
          promotionId: promotion.id,
          promotionName: promotion.name,
          tariff: promotion.tariff,
          bonusSessions: promotion.bonusSessions,
          overridePrice: promotion.overridePrice,
        },
        discount,
      );
    } else if (parsed.data.templateId) {
      const templates = await listActivePackageTemplates(supabase);
      const template = templates.find((t) => t.id === parsed.data.templateId);
      if (!template) {
        return { error: "El paquete seleccionado ya no está disponible." };
      }
      payload = buildPackageSalePayload({ source: "template", template }, discount);
    } else {
      const zoneId = parsed.data.zoneId as string;
      const zoneName =
        formData.get("zoneName")?.toString() || "Zona seleccionada";
      const vatRate = await getDefaultVatRate(supabase);
      payload = buildPackageSalePayload(
        {
          source: "custom",
          zoneId,
          zoneName,
          sessionCount: Number(parsed.data.sessionCount),
          price: Number(parsed.data.price),
          vatRate,
        },
        discount,
      );
    }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "No se pudo registrar la venta del paquete.",
    };
  }

  try {
    await sellPackage(supabase, { clientId, payload });
  } catch (error) {
    const mapped = mapDiscountError(
      error as { code?: string | null; message?: string | null },
    );
    return {
      error:
        discount && (error as { code?: string })?.code === "23514"
          ? mapped
          : "No se pudo registrar la venta del paquete.",
    };
  }

  revalidatePath(`/clientes/${clientId}`);
  return { error: null };
}
