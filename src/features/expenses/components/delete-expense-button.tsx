"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { deleteExpenseAction } from "@/features/expenses/actions/delete-expense";

const initialState = { error: null as string | null };

/** Row-level "eliminar" button on `/gastos`, with a plain confirm dialog. */
export function DeleteExpenseButton({ id }: { id: string }) {
  const [state, formAction, isPending] = useActionState(
    deleteExpenseAction,
    initialState,
  );

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("¿Eliminar este gasto?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        Eliminar
      </Button>
      {state.error ? (
        <p role="alert" className="mt-1 text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
