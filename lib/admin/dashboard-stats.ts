import { getSupabaseAdminClient } from "@/models/db";
import { ADMIN_STATS_TIMEZONE } from "@/lib/admin/datetime";
import type { PromptPurposeCategory, TaskType } from "@/types/admin/tasks";
import {
  PROMPT_PURPOSE_CATEGORY_LABELS,
  isPromptPurposeCategory,
} from "@/lib/admin/prompt-purpose-categories";
import { getPromptPurposeHash } from "@/lib/admin/prompt-purpose-store";

export const ADMIN_STATS_DAY_OPTIONS = [7, 30, 90, 180, 365] as const;
export const DEFAULT_ADMIN_STATS_DAYS = 30;
export { ADMIN_STATS_TIMEZONE };
const FALLBACK_PAGE_SIZE = 1000;
const PROMPT_PURPOSE_ANALYSIS_QUERY_CHUNK_SIZE = 100;

export type AdminStatsDays = (typeof ADMIN_STATS_DAY_OPTIONS)[number];

export interface DailyAdminStats {
  date: string;
  label: string;
  newUsers: number;
  videoTasks: number;
  imageTasks: number;
  videoAgentTasks: number;
  totalTasks: number;
}

export interface DailyAdminStatsSummary {
  totalNewUsers: number;
  totalTasks: number;
  totalVideoTasks: number;
  totalImageTasks: number;
  totalVideoAgentTasks: number;
  averageDailyUsers: number;
  averageDailyTasks: number;
}

export interface DailyAdminStatsResult {
  days: AdminStatsDays;
  timezone: string;
  includeVideoAgent: boolean;
  rows: DailyAdminStats[];
  summary: DailyAdminStatsSummary;
  error?: string;
}

export interface PromptPurposeStatsItem {
  category: PromptPurposeCategory;
  label: string;
  count: number;
  percentage: number;
}

export interface PromptPurposeStatsResult {
  days: AdminStatsDays;
  timezone: string;
  total: number;
  taskCount: number;
  items: PromptPurposeStatsItem[];
  error?: string;
}

interface PromptPurposeTaskRow {
  taskType: TaskType;
  taskId: string;
  promptHash: string;
}

const EMPTY_SUMMARY: DailyAdminStatsSummary = {
  totalNewUsers: 0,
  totalTasks: 0,
  totalVideoTasks: 0,
  totalImageTasks: 0,
  totalVideoAgentTasks: 0,
  averageDailyUsers: 0,
  averageDailyTasks: 0,
};

export function normalizeStatsDays(
  value?: string | number | null,
): AdminStatsDays {
  const numericValue = Number(value);

  if (ADMIN_STATS_DAY_OPTIONS.includes(numericValue as AdminStatsDays)) {
    return numericValue as AdminStatsDays;
  }

  return DEFAULT_ADMIN_STATS_DAYS;
}

function formatDateLabel(date: string): string {
  const [, month, day] = date.split("-");

  if (!month || !day) {
    return date;
  }

  return `${Number(month)}/${Number(day)}`;
}

function getDateInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const partMap = new Map(parts.map((part) => [part.type, part.value]));
  const year = partMap.get("year");
  const month = partMap.get("month");
  const day = partMap.get("day");

  if (!year || !month || !day) {
    return date.toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function buildEmptyRows(
  days: AdminStatsDays,
  timezone: string,
): DailyAdminStats[] {
  const today = getDateInTimeZone(new Date(), timezone);
  const startDate = addDays(today, -(days - 1));

  return Array.from({ length: days }, (_, index) => {
    const date = addDays(startDate, index);

    return {
      date,
      label: formatDateLabel(date),
      newUsers: 0,
      videoTasks: 0,
      imageTasks: 0,
      videoAgentTasks: 0,
      totalTasks: 0,
    };
  });
}

function parseDatabaseTimestamp(value: string): Date {
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2})$/i.test(value);
  return new Date(hasTimezone ? value : `${value}Z`);
}

function incrementRow(
  rowMap: Map<string, DailyAdminStats>,
  createdAt: string | null | undefined,
  timezone: string,
  key: "newUsers" | "videoTasks" | "imageTasks" | "videoAgentTasks",
) {
  if (!createdAt) {
    return;
  }

  const date = getDateInTimeZone(parseDatabaseTimestamp(createdAt), timezone);
  const row = rowMap.get(date);

  if (!row) {
    return;
  }

  row[key] += 1;
}

function summarizeRows(rows: DailyAdminStats[]): DailyAdminStatsSummary {
  if (rows.length === 0) {
    return EMPTY_SUMMARY;
  }

  const totals = rows.reduce(
    (acc, row) => {
      acc.totalNewUsers += row.newUsers;
      acc.totalTasks += row.totalTasks;
      acc.totalVideoTasks += row.videoTasks;
      acc.totalImageTasks += row.imageTasks;
      acc.totalVideoAgentTasks += row.videoAgentTasks;
      return acc;
    },
    {
      totalNewUsers: 0,
      totalTasks: 0,
      totalVideoTasks: 0,
      totalImageTasks: 0,
      totalVideoAgentTasks: 0,
    },
  );

  return {
    ...totals,
    averageDailyUsers: totals.totalNewUsers / rows.length,
    averageDailyTasks: totals.totalTasks / rows.length,
  };
}

async function fetchCreatedAtRows({
  table,
  startDate,
  endDate,
  excludeDeleted = false,
}: {
  table: string;
  startDate: string;
  endDate: string;
  excludeDeleted?: boolean;
}): Promise<string[]> {
  const supabase = getSupabaseAdminClient() as any;
  const rows: string[] = [];
  let offset = 0;

  while (true) {
    let query = supabase
      .from(table)
      .select("created_at")
      .gte("created_at", `${startDate}T00:00:00.000Z`)
      .lt("created_at", `${endDate}T00:00:00.000Z`)
      .order("created_at", { ascending: true })
      .range(offset, offset + FALLBACK_PAGE_SIZE - 1);

    if (excludeDeleted) {
      query = query.neq("status", "deleted");
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(
      ...page
        .map((row: { created_at?: string | null }) => row.created_at)
        .filter(Boolean),
    );

    if (page.length < FALLBACK_PAGE_SIZE) {
      break;
    }

    offset += FALLBACK_PAGE_SIZE;
  }

  return rows;
}

async function fetchPromptPurposeTaskRows({
  table,
  taskType,
  startDate,
  endDate,
  timezone,
  dateSet,
}: {
  table: string;
  taskType: TaskType;
  startDate: string;
  endDate: string;
  timezone: string;
  dateSet: Set<string>;
}): Promise<PromptPurposeTaskRow[]> {
  const supabase = getSupabaseAdminClient() as any;
  const rows: PromptPurposeTaskRow[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select("id, prompt, created_at")
      .gte("created_at", `${startDate}T00:00:00.000Z`)
      .lt("created_at", `${endDate}T00:00:00.000Z`)
      .neq("status", "deleted")
      .not("prompt", "is", null)
      .neq("prompt", "")
      .order("created_at", { ascending: false })
      .range(offset, offset + FALLBACK_PAGE_SIZE - 1);

    if (error) {
      throw new Error(`${table}: ${error.message}`);
    }

    const page = data ?? [];
    rows.push(
      ...page
        .filter(
          (row: {
            id?: string | null;
            prompt?: string | null;
            created_at?: string | null;
          }) => {
            if (!row.id || !row.prompt?.trim() || !row.created_at) {
              return false;
            }

            const localDate = getDateInTimeZone(
              parseDatabaseTimestamp(row.created_at),
              timezone,
            );
            return dateSet.has(localDate);
          },
        )
        .map((row: { id: string; prompt: string }) => ({
          taskType,
          taskId: row.id,
          promptHash: getPromptPurposeHash(row.prompt),
        })),
    );

    if (page.length < FALLBACK_PAGE_SIZE) {
      break;
    }

    offset += FALLBACK_PAGE_SIZE;
  }

  return rows;
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export async function fetchPromptPurposeStats({
  days,
  timezone = ADMIN_STATS_TIMEZONE,
}: {
  days?: string | number | null;
  timezone?: string;
} = {}): Promise<PromptPurposeStatsResult> {
  const normalizedDays = normalizeStatsDays(days);
  const rows = buildEmptyRows(normalizedDays, timezone);
  const dateSet = new Set(rows.map((row) => row.date));
  const startDate = addDays(rows[0].date, -1);
  const endDate = addDays(rows[rows.length - 1].date, 2);

  try {
    const [videoTasks, imageTasks] = await Promise.all([
      fetchPromptPurposeTaskRows({
        table: "user_videos",
        taskType: "video_generation",
        startDate,
        endDate,
        timezone,
        dateSet,
      }),
      fetchPromptPurposeTaskRows({
        table: "user_images",
        taskType: "image_generation",
        startDate,
        endDate,
        timezone,
        dateSet,
      }),
    ]);

    const taskRows = [...videoTasks, ...imageTasks];
    const taskMap = new Map(
      taskRows.map((task) => [`${task.taskType}:${task.taskId}`, task]),
    );
    const counts = new Map<PromptPurposeCategory, number>();
    const supabase = getSupabaseAdminClient() as any;

    for (const taskIdChunk of chunkArray(
      taskRows.map((task) => task.taskId),
      PROMPT_PURPOSE_ANALYSIS_QUERY_CHUNK_SIZE,
    )) {
      if (taskIdChunk.length === 0) {
        continue;
      }

      const { data, error } = await supabase
        .from("prompt_purpose_analyses")
        .select("task_type, task_id, prompt_hash, category, status")
        .eq("status", "completed")
        .in("task_id", taskIdChunk);

      if (error) {
        throw new Error(`prompt_purpose_analyses: ${error.message}`);
      }

      for (const row of data ?? []) {
        const key = `${row.task_type}:${row.task_id}`;
        const task = taskMap.get(key);
        if (!task || task.promptHash !== row.prompt_hash) {
          continue;
        }

        const category = isPromptPurposeCategory(row.category)
          ? row.category
          : "other";
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }

    const total = Array.from(counts.values()).reduce(
      (sum, count) => sum + count,
      0,
    );
    const items = Array.from(counts.entries())
      .map(([category, count]) => ({
        category,
        label: PROMPT_PURPOSE_CATEGORY_LABELS[category],
        count,
        percentage: total > 0 ? (count / total) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

    return {
      days: normalizedDays,
      timezone,
      total,
      taskCount: taskRows.length,
      items,
    };
  } catch (error) {
    console.error("Failed to fetch prompt purpose stats:", error);
    return {
      days: normalizedDays,
      timezone,
      total: 0,
      taskCount: 0,
      items: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchDailyAdminStatsFallback({
  days,
  timezone,
  includeVideoAgent,
}: {
  days: AdminStatsDays;
  timezone: string;
  includeVideoAgent: boolean;
}): Promise<DailyAdminStatsResult> {
  const rows = buildEmptyRows(days, timezone);
  const rowMap = new Map(rows.map((row) => [row.date, row]));
  const startDate = addDays(rows[0].date, -1);
  const endDate = addDays(rows[rows.length - 1].date, 2);

  const [userDates, videoDates, imageDates, videoAgentDates] =
    await Promise.all([
      fetchCreatedAtRows({ table: "users", startDate, endDate }),
      fetchCreatedAtRows({
        table: "user_videos",
        startDate,
        endDate,
        excludeDeleted: true,
      }),
      fetchCreatedAtRows({
        table: "user_images",
        startDate,
        endDate,
        excludeDeleted: true,
      }),
      includeVideoAgent
        ? fetchCreatedAtRows({
            table: "video_agent_projects",
            startDate,
            endDate,
          })
        : Promise.resolve([]),
    ]);

  userDates.forEach((createdAt) =>
    incrementRow(rowMap, createdAt, timezone, "newUsers"),
  );
  videoDates.forEach((createdAt) =>
    incrementRow(rowMap, createdAt, timezone, "videoTasks"),
  );
  imageDates.forEach((createdAt) =>
    incrementRow(rowMap, createdAt, timezone, "imageTasks"),
  );
  videoAgentDates.forEach((createdAt) =>
    incrementRow(rowMap, createdAt, timezone, "videoAgentTasks"),
  );

  rows.forEach((row) => {
    row.totalTasks =
      row.videoTasks +
      row.imageTasks +
      (includeVideoAgent ? row.videoAgentTasks : 0);
  });

  return {
    days,
    timezone,
    includeVideoAgent,
    rows,
    summary: summarizeRows(rows),
  };
}

export async function fetchDailyAdminStats({
  days,
  timezone = ADMIN_STATS_TIMEZONE,
  includeVideoAgent = false,
}: {
  days?: string | number | null;
  timezone?: string;
  includeVideoAgent?: boolean;
} = {}): Promise<DailyAdminStatsResult> {
  const normalizedDays = normalizeStatsDays(days);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase.rpc("get_admin_daily_stats", {
    p_days: normalizedDays,
    p_timezone: timezone,
    p_include_video_agent: includeVideoAgent,
  });

  if (error) {
    if (error.code === "PGRST202") {
      console.warn(
        "Admin daily stats RPC is unavailable; using table fallback.",
      );

      try {
        return await fetchDailyAdminStatsFallback({
          days: normalizedDays,
          timezone,
          includeVideoAgent,
        });
      } catch (fallbackError) {
        console.error(
          "Failed to fetch admin daily stats fallback:",
          fallbackError,
        );
      }
    } else {
      console.error("Failed to fetch admin daily stats:", error);
    }

    return {
      days: normalizedDays,
      timezone,
      includeVideoAgent,
      rows: [],
      summary: EMPTY_SUMMARY,
      error: error.message,
    };
  }

  const rows = (data ?? []).map((row) => ({
    date: row.stat_date,
    label: formatDateLabel(row.stat_date),
    newUsers: row.new_users ?? 0,
    videoTasks: row.video_tasks ?? 0,
    imageTasks: row.image_tasks ?? 0,
    videoAgentTasks: row.video_agent_tasks ?? 0,
    totalTasks: row.total_tasks ?? 0,
  }));

  return {
    days: normalizedDays,
    timezone,
    includeVideoAgent,
    rows,
    summary: summarizeRows(rows),
  };
}
