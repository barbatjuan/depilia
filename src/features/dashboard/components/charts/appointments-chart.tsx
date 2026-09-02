"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CalendarRange } from "lucide-react";
import type { AppointmentsPoint } from "@/features/dashboard/domain/appointments-series";
import { ChartCard } from "@/features/dashboard/components/charts/chart-card";
import { ChartTooltip, axisTick, dayLabel } from "./chart-primitives";

export function AppointmentsChart({ data }: { data: AppointmentsPoint[] }) {
  const total = data.reduce((sum, p) => sum + p.count, 0);

  return (
    <ChartCard
      title="Turnos por día"
      description="Agendados · últimos 14 días"
      icon={CalendarRange}
      figure={String(total)}
    >
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--chart-grid)" />
            <XAxis
              dataKey="date"
              tickFormatter={(iso: string) => dayLabel(iso)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={16}
              tickMargin={8}
            />
            <YAxis
              width={28}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              tickCount={4}
            />
            <Tooltip
              cursor={{ fill: "var(--accent)", opacity: 0.5 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => dayLabel(String(l), "long")}
                  valueFormatter={(v) => `${v} turno${Number(v) === 1 ? "" : "s"}`}
                />
              }
            />
            <Bar
              dataKey="count"
              name="Turnos"
              fill="var(--chart-1)"
              radius={[4, 4, 0, 0]}
              maxBarSize={22}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
