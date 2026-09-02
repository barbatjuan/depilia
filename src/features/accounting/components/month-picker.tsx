"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { nextMonthKey, prevMonthKey } from "@/features/accounting/domain/period";

/**
 * `<input type="month">` + prev/next chevrons, server-filtered via `?mes=`
 * (spec: PASO 5.4 — shareable URL, no client-side report state).
 */
export function MonthPicker({ monthKey }: { monthKey: string }) {
  const router = useRouter();

  function goTo(key: string) {
    router.push(`/contabilidad?mes=${key}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Mes anterior"
        onClick={() => goTo(prevMonthKey(monthKey))}
      >
        <ChevronLeft className="size-4" />
      </Button>
      <input
        type="month"
        value={monthKey}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs"
      />
      <Button
        variant="outline"
        size="icon"
        aria-label="Mes siguiente"
        onClick={() => goTo(nextMonthKey(monthKey))}
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
