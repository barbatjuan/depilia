import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type { PackageTemplateOption } from "@/features/packages/domain/sell-package";

/**
 * A sellable single-zone "bonus" promotion (spec: "promotions / Bonus-session
 * math"): one tariff plus N bonus sessions (e.g. "6+2 gratis"). Sold through
 * the existing single-package 2-insert path, never the combo RPC.
 */
export type BonusPromotionOption = {
  id: string;
  name: string;
  bonusSessions: number;
  overridePrice: number | null;
  tariff: PackageTemplateOption;
};

type RawItem = {
  bonus_sessions: number;
  override_price: number | null;
  package_templates: {
    id: string;
    zone_id: string;
    name: string;
    gender: string;
    size_category: string;
    default_sessions: number;
    session_price: number;
    bono_price: number;
    active: boolean;
    body_zones: { name: string } | null;
  } | null;
};

type RawPromotion = {
  id: string;
  name: string;
  valid_from: string | null;
  valid_to: string | null;
  promotion_items: RawItem[];
};

/**
 * Active `kind = 'bonus'` promotions whose `[valid_from, valid_to]` window
 * contains `businessDate` (BA business date, `yyyy-MM-dd`), joined to their
 * single `promotion_items` row and its tariff snapshot. Read-only; the window
 * is the only enforcement point for a bonus sale (the `sales.promotion_id` FK
 * carries no window check). Promotions whose tariff is archived are dropped.
 */
export async function listActiveBonusPromotions(
  supabase: AppSupabaseClient,
  businessDate: string,
): Promise<BonusPromotionOption[]> {
  const { data, error } = await supabase
    .from("promotions")
    .select(
      "id, name, valid_from, valid_to, promotion_items(bonus_sessions, override_price, package_templates(id, zone_id, name, gender, size_category, default_sessions, session_price, bono_price, active, body_zones(name)))",
    )
    .eq("kind", "bonus")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as unknown as RawPromotion[];
  const result: BonusPromotionOption[] = [];

  for (const promo of rows) {
    if (promo.valid_from && businessDate < promo.valid_from) continue;
    if (promo.valid_to && businessDate > promo.valid_to) continue;
    if (promo.promotion_items.length !== 1) continue;

    const item = promo.promotion_items[0];
    const t = item?.package_templates;
    if (!item || !t || !t.active) continue;

    result.push({
      id: promo.id,
      name: promo.name,
      bonusSessions: item.bonus_sessions,
      overridePrice: item.override_price,
      tariff: {
        id: t.id,
        zoneId: t.zone_id,
        zoneName: t.body_zones?.name ?? "Zona desconocida",
        name: t.name,
        gender: t.gender as PackageTemplateOption["gender"],
        sizeCategory: t.size_category as PackageTemplateOption["sizeCategory"],
        defaultSessions: t.default_sessions,
        sessionPrice: t.session_price,
        bonoPrice: t.bono_price,
      },
    });
  }

  return result;
}
