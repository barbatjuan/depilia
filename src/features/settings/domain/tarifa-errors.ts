export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo guardar la tarifa. Intentá de nuevo.";

/**
 * Maps a raw Postgres/PostgREST error from the tariff ABM into a friendly
 * Spanish message. Matches on SQLSTATE rather than message text:
 * - `23505` — the partial unique index `package_templates_zone_gender_active_idx`
 *   ((zone_id, gender) where active): this zone already has an active tariff
 *   for that gender (also raised when restoring a tariff into a now-occupied slot).
 * - `23514` — the `session_price > 0` / `bono_price > 0` check constraints.
 */
export function mapTarifaError(error: PostgresLikeError): string {
  if (error.code === "23505") {
    return "Ya existe una tarifa activa para esa zona y género.";
  }
  if (error.code === "23514") {
    return "El precio debe ser mayor a 0.";
  }
  return GENERIC_MESSAGE;
}
