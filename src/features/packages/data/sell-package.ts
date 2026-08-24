import type { AppSupabaseClient } from "@/lib/supabase/app-client";
import type {
  LooseSessionPayload,
  PackageSalePayload,
} from "@/features/packages/domain/sell-package";

export type PackageSaleResult = {
  clientPackageId: string;
  saleId: string;
};

/**
 * Persists a package sale (spec: "package-sessions / Sell a package"): a
 * `client_packages` row for exactly one zone with `sessions_used = 0`, no
 * expiry, followed by the matching `sales` row so the sale shows up in
 * Ventas (PR7). Two sequential inserts, not one RPC transaction — an
 * accepted MVP tradeoff (see apply-progress); a failed second insert leaves
 * an orphan `client_packages` row rather than corrupting session counts,
 * since the ledger trigger only ever touches `sessions_used` on appointment
 * status changes, never on package creation.
 */
export async function sellPackage(
  supabase: AppSupabaseClient,
  params: { clientId: string; payload: PackageSalePayload },
): Promise<PackageSaleResult> {
  const { data: pkg, error: pkgError } = await supabase
    .from("client_packages")
    .insert({
      client_id: params.clientId,
      template_id: params.payload.templateId,
      zone_id: params.payload.zoneId,
      total_sessions: params.payload.totalSessions,
    })
    .select("id")
    .single();
  if (pkgError) throw pkgError;

  const { data: sale, error: saleError } = await supabase
    .from("sales")
    .insert({
      client_id: params.clientId,
      client_package_id: pkg.id,
      description: params.payload.description,
      total: params.payload.price,
    })
    .select("id")
    .single();
  if (saleError) throw saleError;

  return { clientPackageId: pkg.id, saleId: sale.id };
}

export type LooseSessionSaleResult = {
  saleId: string;
};

/**
 * Persists a loose/single-session sale (spec: "package-sessions / Sell a
 * loose session"): a `sales` row tied only to the client, with no
 * `client_package_id` — no `client_packages` row is ever created.
 */
export async function sellLooseSession(
  supabase: AppSupabaseClient,
  params: { clientId: string; payload: LooseSessionPayload },
): Promise<LooseSessionSaleResult> {
  const { data: sale, error } = await supabase
    .from("sales")
    .insert({
      client_id: params.clientId,
      description: params.payload.description,
      total: params.payload.price,
    })
    .select("id")
    .single();
  if (error) throw error;

  return { saleId: sale.id };
}
