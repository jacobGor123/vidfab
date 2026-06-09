"use client";

import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { BrainCircuit } from "lucide-react";
import {
  ChartConfig,
  ChartContainer,
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
import type { PromptPurposeStatsResult } from "@/lib/admin/dashboard-stats";
import type { PromptPurposeCategory } from "@/types/admin/tasks";

const chartConfig = {
  count: {
    label: "Prompts",
    color: "#2563eb",
  },
} satisfies ChartConfig;

const categoryColors: Record<PromptPurposeCategory, string> = {
  marketing_ad: "#e11d48",
  product_showcase: "#0891b2",
  social_content: "#2563eb",
  storytelling: "#7c3aed",
  education_tutorial: "#059669",
  entertainment_meme: "#c026d3",
  personal_memory: "#d97706",
  character_avatar: "#9333ea",
  scene_visualization: "#0284c7",
  fashion_beauty: "#db2777",
  music_dance: "#4f46e5",
  game_anime: "#65a30d",
  business_presentation: "#475569",
  image_editing_request: "#0d9488",
  other: "#6b7280",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatPercent(value: number): string {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

interface PromptPurposeStatsChartProps {
  stats: PromptPurposeStatsResult;
}

export default function PromptPurposeStatsChart({
  stats,
}: PromptPurposeStatsChartProps) {
  const chartData = stats.items.map((item) => ({
    ...item,
    percentLabel: formatPercent(item.percentage),
    fill: categoryColors[item.category] || categoryColors.other,
  }));
  const coverage =
    stats.taskCount > 0 ? (stats.total / stats.taskCount) * 100 : 0;

  return (
    <Card className="rounded-lg border-gray-200 bg-white shadow-sm">
      <CardHeader className="flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle className="text-lg text-gray-900">
            Prompt Purpose Distribution
          </CardTitle>
          <CardDescription>
            AI-classified creative intent over the last {stats.days} days.
          </CardDescription>
        </div>
        <div className="inline-flex w-fit items-center gap-2 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700">
          <BrainCircuit className="h-4 w-4" />
          <span>
            {formatNumber(stats.total)} / {formatNumber(stats.taskCount)} tasks
            analyzed
            {stats.taskCount > 0 ? ` (${formatPercent(coverage)})` : ""}
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-5 pt-0">
        {stats.error ? (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 text-sm text-red-700">
            Failed to load prompt purpose stats: {stats.error}
          </div>
        ) : stats.items.length === 0 ? (
          <div className="flex min-h-32 items-center justify-center rounded-md border border-dashed border-gray-300 px-4 text-sm text-gray-500">
            No analyzed prompt purpose data in this date range.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
            <ChartContainer
              config={chartConfig}
              className="h-[360px] w-full aspect-auto"
            >
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 6, right: 48, left: 8, bottom: 6 }}
              >
                <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={150}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  className="text-xs"
                />
                <ChartTooltip
                  cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
                  content={
                    <ChartTooltipContent
                      formatter={(value, _, item) => {
                        const row = item.payload as
                          | (typeof chartData)[number]
                          | undefined;
                        return (
                          <div className="flex min-w-32 items-center justify-between gap-4">
                            <span>Prompts</span>
                            <span className="font-mono font-semibold">
                              {formatNumber(Number(value))} /{" "}
                              {row ? formatPercent(row.percentage) : ""}
                            </span>
                          </div>
                        );
                      }}
                    />
                  }
                />
                <Bar dataKey="count" radius={[0, 5, 5, 0]}>
                  {chartData.map((entry) => (
                    <Cell key={entry.category} fill={entry.fill} />
                  ))}
                  <LabelList
                    dataKey="percentLabel"
                    position="right"
                    className="fill-gray-500 text-xs font-medium"
                  />
                </Bar>
              </BarChart>
            </ChartContainer>

            <div className="min-w-0 rounded-md border border-gray-100">
              <div className="grid grid-cols-[minmax(0,1fr)_72px_72px] border-b border-gray-100 px-3 py-2 text-xs font-semibold uppercase tracking-normal text-gray-500">
                <span>Category</span>
                <span className="text-right">Count</span>
                <span className="text-right">Share</span>
              </div>
              <div className="divide-y divide-gray-100">
                {stats.items.map((item) => (
                  <div
                    key={item.category}
                    className="grid grid-cols-[minmax(0,1fr)_72px_72px] items-center gap-2 px-3 py-2.5 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{
                          backgroundColor:
                            categoryColors[item.category] ||
                            categoryColors.other,
                        }}
                      />
                      <span className="truncate font-medium text-gray-800">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-right font-mono text-gray-700">
                      {formatNumber(item.count)}
                    </span>
                    <span className="text-right font-mono text-gray-500">
                      {formatPercent(item.percentage)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
