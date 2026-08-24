"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  archiveCategoryAction,
  deleteCategoryAction,
} from "@/features/expenses/actions/delete-category";

const initialState = { error: null as string | null };

/**
 * Row-level "eliminar" button on `/configuracion/categorias`. On a DB
 * `RESTRICT` rejection (category has expense history), the friendly mapped
 * error offers an "archivar en su lugar" fallback instead of a dead end.
 */
export function DeleteCategoryButton({ id }: { id: string }) {
  const [deleteState, deleteFormAction, isDeletePending] = useActionState(
    deleteCategoryAction,
    initialState,
  );
  const [archiveState, archiveFormAction, isArchivePending] = useActionState(
    archiveCategoryAction,
    initialState,
  );

  const blockedByHistory = deleteState.error?.includes("gastos asociados");

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <form
          action={deleteFormAction}
          onSubmit={(event) => {
            if (!window.confirm("¿Eliminar esta categoría?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={id} />
          <Button
            type="submit"
            variant="outline"
            size="sm"
            disabled={isDeletePending}
          >
            Eliminar
          </Button>
        </form>
        {blockedByHistory ? (
          <form action={archiveFormAction}>
            <input type="hidden" name="id" value={id} />
            <Button type="submit" size="sm" disabled={isArchivePending}>
              Archivar
            </Button>
          </form>
        ) : null}
      </div>
      {deleteState.error ? (
        <p role="alert" className="text-xs text-destructive">
          {deleteState.error}
        </p>
      ) : null}
      {archiveState.error ? (
        <p role="alert" className="text-xs text-destructive">
          {archiveState.error}
        </p>
      ) : null}
    </div>
  );
}
