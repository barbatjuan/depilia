import { describe, expect, it } from "vitest";
import { mapCategoryDeleteError } from "@/features/expenses/domain/category-delete-errors";

describe("mapCategoryDeleteError", () => {
  it("maps a foreign-key RESTRICT violation into a friendly Spanish message", () => {
    const message = mapCategoryDeleteError({
      code: "23503",
      message:
        'update or delete on table "expense_categories" violates foreign key constraint "expenses_category_id_fkey" on table "expenses"',
    });

    expect(message).toBe(
      "No podés eliminar esta categoría porque tiene gastos asociados. Podés archivarla en su lugar.",
    );
  });

  it("falls back to a generic message for an unrecognized error", () => {
    const message = mapCategoryDeleteError({
      code: "23505",
      message: "duplicate key value violates unique constraint",
    });

    expect(message).toBe(
      "No se pudo eliminar la categoría. Intentá de nuevo.",
    );
  });

  it("falls back to a generic message when the error has no code or message at all", () => {
    const message = mapCategoryDeleteError({});

    expect(message).toBe(
      "No se pudo eliminar la categoría. Intentá de nuevo.",
    );
  });
});
