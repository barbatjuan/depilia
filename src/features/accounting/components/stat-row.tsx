import { cn } from "@/lib/utils";

/** One label/value stat, optionally with a Δ% badge — used across report cards. */
export function StatRow({
  label,
  value,
  deltaPct,
  hero = false,
}: {
  label: string;
  value: string;
  deltaPct?: number | null;
  hero?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "tnum font-medium text-foreground",
            hero ? "text-xl font-semibold" : "text-sm",
          )}
        >
          {value}
        </span>
        {deltaPct !== undefined && deltaPct !== null ? (
          <span
            className={cn(
              "tnum rounded-full px-1.5 py-0.5 text-xs font-medium",
              deltaPct >= 0
                ? "bg-success-muted text-success-foreground"
                : "bg-destructive/10 text-destructive",
            )}
          >
            {deltaPct >= 0 ? "+" : ""}
            {deltaPct}%
          </span>
        ) : null}
      </div>
    </div>
  );
}
