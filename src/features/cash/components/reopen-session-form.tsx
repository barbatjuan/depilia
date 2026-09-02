"use client";

import { useActionState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CashActionState } from "@/features/cash/actions/open-session";

const initialState: CashActionState = { error: null };

/**
 * "Reabrir caja" — shown on the closed-caja screen so an operator who closed
 * early can keep taking cash the same day (migration `0017`). Re-opening
 * clears the arqueo; a later close recomputes it.
 */
export function ReopenSessionForm({
  action,
}: {
  action: () => Promise<CashActionState>;
}) {
  const [state, formAction, isPending] = useActionState(
    () => action(),
    initialState,
  );

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <div>
        <Button type="submit" variant="outline" disabled={isPending}>
          <RotateCcw className="size-4" />
          {isPending ? "Reabriendo…" : "Reabrir caja"}
        </Button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
