import { cache } from "react";
import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { TARIFA_VAT_DEFAULT } from "@/features/settings/schema";

/**
 * Resolves the clinic's configured `default_vat_rate` for an ad-hoc (custom)
 * package sale with no tariff to snapshot from. Wrapped in React `cache()`
 * (mirrors `getMoneyFormat`) so a single request shares one query. Falls back
 * to `TARIFA_VAT_DEFAULT` when the singleton `clinic_settings` row is
 * missing — integration suites truncate the table.
 */
export const getDefaultVatRate = cache(
  async (supabase: AppSupabaseClient): Promise<number> => {
    const { data } = await supabase
      .from("clinic_settings")
      .select("default_vat_rate")
      .maybeSingle();

    return data?.default_vat_rate ?? TARIFA_VAT_DEFAULT;
  },
);
