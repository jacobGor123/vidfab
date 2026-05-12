"use client";

import React from "react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Activity, Film, ImageIcon, Users, WandSparkles } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DailyAdminStats,
  DailyAdminStatsSummary,
} from "@/lib/admin/dashboard-stats";

const chartConfig = {
  newUsers: {
    label: "New users",
    color: "#2563eb",
  },
  totalTasks: {
    label: "Tasks",
    color: "#16a34a",
  },
  videoTasks: {
    label: "Video",
    color: "#7c3aed",
  },
  imageTasks: {
    label: "Image",
    color: "#f97316",
  },
  videoAgentTasks: {
    label: "Video Agent",
    color: "#dc2626",
  },
} satisfies ChartConfig;

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatAverage(value: number): string {
  return value.toFixed(value >= 10 ? 0 : 1);
}

interface DailyStatsChartProps {
  rows: DailyAdminStats[];
  summary: DailyAdminStatsSummary;
  timezone: string;
  includeVideoAgent: boolean;
}

export default function DailyStatsChart({
  rows,
  summary,
  timezone,
  includeVideoAgent,
}: DailyStatsChartProps) {
  const statCards = [
    {
      label: "New Users",
      value: summary.totalNewUsers,
      hint: `${formatAverage(summary.averageDailyUsers)} / day`,
      icon: Users,
      className: "bg-blue-50 text-blue-700",
    },
    {
      label: "Tasks",
      value: summary.totalTasks,
      hint: `${formatAverage(summary.averageDailyTasks)} / day`,
      icon: Activity,
      className: "bg-green-50 text-green-700",
    },
    {
      label: "Video Tasks",
      value: summary.totalVideoTasks,
      hint: "Text, image, effects",
      icon: Film,
      className: "bg-violet-50 text-violet-700",
    },
    {
      label: "Image Tasks",
      value: summary.totalImageTasks,
      hint: "Text and image edits",
      icon: ImageIcon,
      className: "bg-orange-50 text-orange-700",
    },
  ];

  if (includeVideoAgent) {
    statCards.push({
      label: "Video Agent",
      value: summary.totalVideoAgentTasks,
      hint: "Story projects",
      icon: WandSparkles,
      className: "bg-red-50 text-red-700",
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;

          return (
            <Card
              key={stat.label}
              className="rounded-lg border-gray-200 bg-white shadow-sm"
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                <CardDescription className="text-xs font-semibold uppercase tracking-normal text-gray-500">
                  {stat.label}
                </CardDescription>
                <div className={`rounded-md p-2 ${stat.className}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="text-3xl font-bold text-gray-900">
                  {formatNumber(stat.value)}
                </div>
                <p className="mt-1 text-xs text-gray-500">{stat.hint}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="rounded-lg border-gray-200 bg-white shadow-sm">
        <CardHeader className="p-5">
          <CardTitle className="text-lg text-gray-900">Daily Trend</CardTitle>
          <CardDescription>Timezone: {timezone}</CardDescription>
        </CardHeader>
        <CardContent className="p-5 pt-0">
          {rows.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center rounded-md border border-dashed border-gray-300 text-sm text-gray-500">
              No statistics available.
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="h-[320px] w-full aspect-auto"
            >
              <LineChart
                data={rows}
                margin={{ top: 8, right: 18, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                  minTickGap={18}
                />
                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={36}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_, payload) => {
                        const row = payload?.[0]?.payload as
                          | DailyAdminStats
                          | undefined;
                        return row?.date ?? "";
                      }}
                    />
                  }
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Line
                  dataKey="newUsers"
                  type="monotone"
                  stroke="var(--color-newUsers)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="totalTasks"
                  type="monotone"
                  stroke="var(--color-totalTasks)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="videoTasks"
                  type="monotone"
                  stroke="var(--color-videoTasks)"
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Line
                  dataKey="imageTasks"
                  type="monotone"
                  stroke="var(--color-imageTasks)"
                  strokeWidth={1.8}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                {includeVideoAgent && (
                  <Line
                    dataKey="videoAgentTasks"
                    type="monotone"
                    stroke="var(--color-videoAgentTasks)"
                    strokeWidth={1.8}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                )}
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
