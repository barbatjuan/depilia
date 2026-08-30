import { cache } from "react";
import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import { DEFAULT_MONEY_FORMAT, type MoneyFormat } from "@/lib/money";

/**
 * Resolves the clinic's configured (currency, locale) for the current request
 * (spec: clinic-currency R1, R3). Wrapped in React `cache()` so the dashboard
 * layout and every RSC page that also calls it share a single query per
 * request. Falls back to `DEFAULT_MONEY_FORMAT` when the singleton
 * `clinic_settings` row is missing — integration suites truncate the table and
 * a fresh deploy may not have seeded it yet.
 */
export const getMoneyFormat = cache(
  async (supabase: AppSupabaseClient): Promise<MoneyFormat> => {
    const { data } = await supabase
      .from("clinic_settings")
      .select("currency, locale")
      .maybeSingle();

    if (!data?.currency || !data?.locale) return DEFAULT_MONEY_FORMAT;
    return { currency: data.currency, locale: data.locale };
  },
);
