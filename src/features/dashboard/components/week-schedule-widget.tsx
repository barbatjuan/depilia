import { CalendarRange } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WeekSchedule } from "@/features/dashboard/data/get-week-schedule";

const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function todayIndexInWeek(weekStart: string): number {
  const now = new Date();
  const start = new Date(weekStart);
  const diffDays = Math.floor(
    (now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000),
  );
  return diffDays >= 0 && diffDays < 7 ? diffDays : -1;
}

export function WeekScheduleWidget({ week }: { week: WeekSchedule }) {
  const total = week.countsByWeekday.reduce((sum, n) => sum + n, 0);
  const maxCount = Math.max(1, ...week.countsByWeekday);
  const todayIndex = todayIndexInWeek(week.weekStart);

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarRange className="size-4 text-brand" />
          <CardTitle>Esta semana</CardTitle>
        </div>
        <CardDescription>
          {total === 0
            ? "Sin turnos agendados esta semana."
            : `${total} turno${total === 1 ? "" : "s"} en la semana`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {DAY_LABELS.map((label, index) => {
            const count = week.countsByWeekday[index] ?? 0;
            const isToday = index === todayIndex;
            const heightPct = Math.round((count / maxCount) * 100);
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div className="flex h-16 w-full items-end justify-center rounded-md bg-muted/50 p-1">
                  <div
                    className={cn(
                      "w-full rounded-sm bg-brand-muted",
                      count > 0 && "bg-brand",
                    )}
                    style={{ height: count > 0 ? `${Math.max(heightPct, 12)}%` : "4%" }}
                  />
                </div>
                <span
                  className={cn(
                    "text-xs font-medium text-muted-foreground",
                    isToday && "text-brand font-semibold",
                  )}
                >
                  {label}
                </span>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
