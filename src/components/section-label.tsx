/**
 * The small-caps eyebrow that heads a dashboard / report section. Same visual
 * idiom as `SidebarGroupLabel`. Extracted so `/dashboard` and `/contabilidad`
 * share one definition.
 */
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-3 text-[0.6875rem] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
      {children}
    </h2>
  );
}
