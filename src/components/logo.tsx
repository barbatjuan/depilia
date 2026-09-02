import { cn } from "@/lib/utils";

/**
 * Depilia brand lockup. The mark is a four-point "gleam" — a laser flash /
 * skin-glow motif — that still reads at favicon size. `variant="mark"` drops
 * the wordmark for the collapsed sidebar and other tight spots.
 */
export function Logo({
  variant = "full",
  className,
}: {
  variant?: "full" | "mark";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 text-foreground",
        className,
      )}
    >
      <LogoMark className="size-6 shrink-0 text-brand" />
      {variant === "full" ? (
        <span className="font-display text-lg leading-none tracking-tight">
          Depilia
        </span>
      ) : null}
    </span>
  );
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 1.5c.55 6.03 4.47 9.95 10.5 10.5-6.03.55-9.95 4.47-10.5 10.5-.55-6.03-4.47-9.95-10.5-10.5C7.53 11.45 11.45 7.53 12 1.5Z"
        fill="currentColor"
      />
      <circle cx="19" cy="5" r="1.6" fill="currentColor" opacity="0.55" />
    </svg>
  );
}
