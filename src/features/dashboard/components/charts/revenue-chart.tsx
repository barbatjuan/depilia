"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp } from "lucide-react";
import { formatMoney, type MoneyFormat } from "@/lib/money";
import type { RevenuePoint } from "@/features/dashboard/domain/revenue-series";
import { ChartCard } from "@/features/dashboard/components/charts/chart-card";
import { ChartTooltip, axisTick, dayLabel } from "./chart-primitives";

export function RevenueChart({
  data,
  moneyFormat,
}: {
  data: RevenuePoint[];
  moneyFormat: MoneyFormat;
}) {
  const total = data.reduce((sum, p) => sum + p.total, 0);
  const compact = new Intl.NumberFormat(moneyFormat.locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  return (
    <ChartCard
      title="Ingresos"
      description="Cobros por día · últimos 30 días"
      icon={TrendingUp}
      figure={formatMoney(total, moneyFormat)}
    >
      <div className="h-[220px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 6, right: 8, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.28}
                />
                <stop
                  offset="100%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--chart-grid)"
              strokeDasharray="0"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(iso: string) => dayLabel(iso)}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              minTickGap={28}
              tickMargin={8}
            />
            <YAxis
              width={44}
              tick={axisTick}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => compact.format(v)}
              tickCount={4}
            />
            <Tooltip
              cursor={{ stroke: "var(--chart-axis)", strokeWidth: 1 }}
              content={
                <ChartTooltip
                  labelFormatter={(l) => dayLabel(String(l), "long")}
                  valueFormatter={(v) => formatMoney(Number(v), moneyFormat)}
                />
              }
            />
            <Area
              type="monotone"
              dataKey="total"
              name="Ingresos"
              stroke="var(--chart-1)"
              strokeWidth={2}
              fill="url(#revenueFill)"
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
