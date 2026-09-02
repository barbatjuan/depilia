import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Stat tile for the dashboard KPI row (design "boutique"): a serif value,
 * a small-caps label, and the metric's icon in a soft gold-tinted square.
 * `tone` lets a metric that is a warning ("paquetes por vencer") carry a
 * status colour without a solid fill.
 *
 * The value stays the sole child of `[data-slot="card-content"]` — e2e's
 * `getKpiValue` (golden-path.spec.ts) reads `card-content > div:first`.
 */
export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  tone = "default",
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  tone?: "default" | "warning";
}) {
  return (
    <Card className="gap-3 py-5 shadow-sm transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between gap-2 px-5">
        <span className="text-[0.6875rem] font-medium tracking-[0.12em] text-muted-foreground uppercase">
          {label}
        </span>
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg",
            tone === "warning"
              ? "bg-warning-muted text-warning-foreground"
              : "bg-brand-muted text-brand",
          )}
        >
          <Icon className="size-[1.05rem]" />
        </span>
      </CardHeader>
      <CardContent className="px-5">
        <div className="font-display tnum text-[1.6rem] leading-tight text-foreground">
          {value}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
