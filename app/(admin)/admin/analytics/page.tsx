import Link from "next/link";
import DailyStatsChart from "@/components/admin/daily-stats-chart";
import {
  ADMIN_STATS_DAY_OPTIONS,
  fetchDailyAdminStats,
  normalizeStatsDays,
} from "@/lib/admin/dashboard-stats";

export const dynamic = "force-dynamic";
export const revalidate = 0;

interface AnalyticsPageProps {
  searchParams: {
    days?: string;
    includeVideoAgent?: string;
  };
}

function analyticsHref(days: number, includeVideoAgent: boolean): string {
  const params = new URLSearchParams({ days: String(days) });

  if (includeVideoAgent) {
    params.set("includeVideoAgent", "true");
  }

  return `/admin/analytics?${params.toString()}`;
}

export default async function AdminAnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const days = normalizeStatsDays(searchParams.days);
  const includeVideoAgent = searchParams.includeVideoAgent === "true";
  const stats = await fetchDailyAdminStats({
    days,
    includeVideoAgent,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="mt-1 text-sm text-gray-600">
            Daily registrations and task volume.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {ADMIN_STATS_DAY_OPTIONS.map((option) => {
            const isActive = option === stats.days;

            return (
              <Link
                key={option}
                href={analyticsHref(option, includeVideoAgent)}
                data-active={isActive}
                className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? "admin-tab-trigger border-blue-600 bg-blue-600 text-white"
                    : "admin-tab-trigger border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"
                }`}
              >
                {option}d
              </Link>
            );
          })}

          <Link
            href={analyticsHref(days, !includeVideoAgent)}
            data-active={includeVideoAgent}
            className={`rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
              includeVideoAgent
                ? "admin-tab-trigger border-red-200 bg-red-50 text-red-700 hover:border-red-300"
                : "admin-tab-trigger border-gray-200 bg-white text-gray-700 hover:border-red-200 hover:text-red-700"
            }`}
          >
            Video Agent {includeVideoAgent ? "On" : "Off"}
          </Link>
        </div>
      </div>

      {stats.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load analytics: {stats.error}. Run the admin daily stats
          migration before using this page.
        </div>
      )}

      <DailyStatsChart
        rows={stats.rows}
        summary={stats.summary}
        timezone={stats.timezone}
        includeVideoAgent={stats.includeVideoAgent}
      />
    </div>
  );
}
