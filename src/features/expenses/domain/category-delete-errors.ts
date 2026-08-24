export type PostgresLikeError = {
  code?: string | null;
  message?: string | null;
};

const GENERIC_MESSAGE = "No se pudo eliminar la categoría. Intentá de nuevo.";

/**
 * Maps a raw Postgres/PostgREST error into a friendly Spanish message —
 * never lets the `expenses_category_id_fkey` `ON DELETE RESTRICT` violation
 * (migration `0007_expenses.sql`, design decision 6) reach the UI as a raw
 * exception. Matches on the standard `foreign_key_violation` SQLSTATE
 * (`23503`) rather than message text, which is more robust across Postgres
 * versions (see project learning: constraint names/text can drift).
 */
export function mapCategoryDeleteError(error: PostgresLikeError): string {
  if (error.code === "23503") {
    return "No podés eliminar esta categoría porque tiene gastos asociados. Podés archivarla en su lugar.";
  }
  return GENERIC_MESSAGE;
}
