"use client";

const dayShort = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  day: "numeric",
  month: "short",
});

const dayLong = new Intl.DateTimeFormat("es-AR", {
  timeZone: "America/Argentina/Buenos_Aires",
  weekday: "long",
  day: "numeric",
  month: "long",
});

/** `yyyy-MM-dd` → "12 sept" (or the long weekday form). */
export function dayLabel(iso: string, variant: "short" | "long" = "short") {
  const d = new Date(`${iso}T12:00:00Z`);
  return (variant === "long" ? dayLong : dayShort).format(d);
}

export const axisTick = {
  fill: "var(--chart-axis)",
  fontSize: 11,
} as const;

type TooltipEntry = { name?: string; value?: number | string; color?: string };

/**
 * Themed replacement for recharts' default tooltip — a hairline card with the
 * point label and one row per series (swatch · name · value). Text stays in
 * ink tokens; only the swatch carries the series colour (dataviz skill).
 */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  labelFormatter?: (label: string | number) => string;
  valueFormatter?: (value: number | string) => string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border/70 bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-foreground">
        {labelFormatter && label !== undefined
          ? labelFormatter(label)
          : String(label ?? "")}
      </p>
      <ul className="flex flex-col gap-1">
        {payload.map((entry, i) => (
          <li key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[2px]"
              style={{ background: entry.color }}
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="tnum ml-auto font-medium text-foreground">
              {valueFormatter && entry.value !== undefined
                ? valueFormatter(entry.value)
                : String(entry.value ?? "")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
