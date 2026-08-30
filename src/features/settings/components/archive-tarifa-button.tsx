"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import {
  archiveTarifaAction,
  restoreTarifaAction,
  type ArchiveTarifaState,
} from "@/features/settings/actions/archive-tarifa";

const initialState: ArchiveTarifaState = { error: null };

/**
 * Row-level archive / restore toggle on `/configuracion/tarifas`. Archive is
 * the only safe removal (design decision 8): `client_packages.template_id` is
 * `ON DELETE SET NULL`, so a hard delete would silently orphan sale history.
 */
export function ArchiveTarifaButton({
  id,
  active,
}: {
  id: string;
  active: boolean;
}) {
  const [state, formAction, isPending] = useActionState(
    active ? archiveTarifaAction : restoreTarifaAction,
    initialState,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form action={formAction}>
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="outline" size="sm" disabled={isPending}>
          {active ? "Archivar" : "Restaurar"}
        </Button>
      </form>
      {state.error ? (
        <p role="alert" className="text-xs text-destructive">
          {state.error}
        </p>
      ) : null}
    </div>
  );
}
