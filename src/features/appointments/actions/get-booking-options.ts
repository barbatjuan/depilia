"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import {
  listClientActivePackages,
  listClientLooseSales,
  type ActiveClientPackageOption,
  type LooseSaleOption,
} from "@/features/appointments/data/booking-options";

export type BookingOptions = {
  packages: ActiveClientPackageOption[];
  looseSales: LooseSaleOption[];
};

/**
 * Fetches a client's active packages and unclaimed loose sales for the
 * booking form's picker, called directly from the client component when
 * the admin selects a client (Next.js server actions are plain async
 * functions callable from client code, no separate route handler needed).
 */
export async function getBookingOptionsAction(
  clientId: string,
): Promise<BookingOptions> {
  if (!clientId) return { packages: [], looseSales: [] };

  const supabase = await createSupabaseClient();
  const [packages, looseSales] = await Promise.all([
    listClientActivePackages(supabase, clientId),
    listClientLooseSales(supabase, clientId),
  ]);

  return { packages, looseSales };
}
