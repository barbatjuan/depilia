import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

/**
 * Shared frame for the dashboard charts: an icon-led title, an optional
 * headline figure (the chart's own "table view" relief for low-contrast
 * fills — dataviz skill), and the plotted area.
 */
export function ChartCard({
  title,
  description,
  icon: Icon,
  figure,
  children,
}: {
  title: string;
  description?: string;
  icon: LucideIcon;
  figure?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-4 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Icon className="size-4 text-brand" />
            <CardTitle>{title}</CardTitle>
          </div>
          {figure ? (
            <span className="font-display tnum text-lg leading-none text-foreground">
              {figure}
            </span>
          ) : null}
        </div>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
