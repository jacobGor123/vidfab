import { createHash } from 'crypto';
import { getSupabaseAdminClient } from '@/models/db';
import type {
  PromptPurposeAnalysis,
  PromptPurposeCategory,
  PromptPurposeStatus,
  TaskType,
  UnifiedTask,
} from '@/types/admin/tasks';
import {
  PROMPT_PURPOSE_CATEGORY_LABELS,
  isPromptPurposeCategory,
} from '@/lib/admin/prompt-purpose-categories';

interface PromptPurposeDbRow {
  task_type: TaskType;
  task_id: string;
  prompt_hash: string;
  category: string;
  label: string | null;
  summary: string | null;
  tags: string[] | null;
  confidence: number | string | null;
  status: PromptPurposeStatus;
  model: string | null;
  error_message: string | null;
  analyzed_at: string | null;
}

export interface PromptPurposeCompletedFields {
  category: PromptPurposeCategory;
  label: string;
  summary: string | null;
  tags: string[];
  confidence: number;
  model: string | null;
}

export interface UpsertPromptPurposeAnalysisInput {
  taskType: TaskType;
  taskId: string;
  promptHash: string;
  status: PromptPurposeStatus;
  category?: PromptPurposeCategory;
  label?: string;
  summary?: string | null;
  tags?: string[];
  confidence?: number;
  model?: string | null;
  errorMessage?: string | null;
  analyzedAt?: string | null;
}

function clampConfidence(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }

  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function normalizeCategory(value: unknown): PromptPurposeCategory {
  return isPromptPurposeCategory(value) ? value : 'other';
}

function createTaskKey(taskType: TaskType, taskId: string): string {
  return `${taskType}:${taskId}`;
}

function toClientAnalysis(row: PromptPurposeDbRow): PromptPurposeAnalysis {
  const category = normalizeCategory(row.category);
  const label = row.label?.trim() || PROMPT_PURPOSE_CATEGORY_LABELS[category];

  return {
    category,
    label,
    summary: row.summary || null,
    tags: normalizeTags(row.tags),
    confidence: clampConfidence(row.confidence),
    status: row.status,
    model: row.model,
    analyzed_at: row.analyzed_at,
    error_message: row.error_message,
  };
}

export function getPromptPurposeHash(prompt: string): string {
  return createHash('sha256').update(prompt.trim()).digest('hex');
}

export async function attachPromptPurposeAnalyses(tasks: UnifiedTask[]): Promise<UnifiedTask[]> {
  const analysableTasks = tasks.filter((task) => task.id && task.prompt?.trim());

  if (analysableTasks.length === 0) {
    return tasks;
  }

  const taskIds = [...new Set(analysableTasks.map((task) => task.id))];
  const taskTypes = [...new Set(analysableTasks.map((task) => task.task_type))];
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from('prompt_purpose_analyses')
    .select('task_type, task_id, prompt_hash, category, label, summary, tags, confidence, status, model, error_message, analyzed_at')
    .in('task_id', taskIds)
    .in('task_type', taskTypes);

  if (error) {
    console.warn('[PromptPurpose] Failed to fetch prompt purpose analyses:', error.message);
    return tasks;
  }

  const analysisMap = new Map<string, PromptPurposeDbRow>();
  for (const row of data ?? []) {
    analysisMap.set(createTaskKey(row.task_type, row.task_id), row);
  }

  return tasks.map((task) => {
    if (!task.prompt?.trim()) {
      return task;
    }

    const row = analysisMap.get(createTaskKey(task.task_type, task.id));
    if (!row || row.prompt_hash !== getPromptPurposeHash(task.prompt)) {
      return task;
    }

    return {
      ...task,
      prompt_purpose: toClientAnalysis(row),
    };
  });
}

export async function fetchCompletedAnalysesByPromptHash(
  promptHashes: string[]
): Promise<Map<string, PromptPurposeCompletedFields>> {
  const hashes = [...new Set(promptHashes.filter(Boolean))];

  if (hashes.length === 0) {
    return new Map();
  }

  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from('prompt_purpose_analyses')
    .select('prompt_hash, category, label, summary, tags, confidence, model')
    .eq('status', 'completed')
    .in('prompt_hash', hashes)
    .order('analyzed_at', { ascending: false });

  if (error) {
    console.warn('[PromptPurpose] Failed to fetch reusable analyses:', error.message);
    return new Map();
  }

  const result = new Map<string, PromptPurposeCompletedFields>();

  for (const row of data ?? []) {
    if (result.has(row.prompt_hash)) {
      continue;
    }

    const category = normalizeCategory(row.category);
    result.set(row.prompt_hash, {
      category,
      label: row.label?.trim() || PROMPT_PURPOSE_CATEGORY_LABELS[category],
      summary: row.summary || null,
      tags: normalizeTags(row.tags),
      confidence: clampConfidence(row.confidence),
      model: row.model || null,
    });
  }

  return result;
}

export async function fetchAnalysesForTasks(
  tasks: Array<{ taskType: TaskType; taskId: string }>
): Promise<Map<string, PromptPurposeDbRow>> {
  if (tasks.length === 0) {
    return new Map();
  }

  const taskIds = [...new Set(tasks.map((task) => task.taskId))];
  const taskTypes = [...new Set(tasks.map((task) => task.taskType))];
  const supabase = getSupabaseAdminClient() as any;

  const { data, error } = await supabase
    .from('prompt_purpose_analyses')
    .select('task_type, task_id, prompt_hash, category, label, summary, tags, confidence, status, model, error_message, analyzed_at')
    .in('task_id', taskIds)
    .in('task_type', taskTypes);

  if (error) {
    throw new Error(`Failed to fetch existing prompt analyses: ${error.message}`);
  }

  const result = new Map<string, PromptPurposeDbRow>();
  for (const row of data ?? []) {
    result.set(createTaskKey(row.task_type, row.task_id), row);
  }

  return result;
}

export async function upsertPromptPurposeAnalysis(input: UpsertPromptPurposeAnalysisInput): Promise<void> {
  const category = input.category || 'other';
  const now = new Date().toISOString();
  const payload = {
    task_type: input.taskType,
    task_id: input.taskId,
    prompt_hash: input.promptHash,
    category,
    label: input.label?.trim() || PROMPT_PURPOSE_CATEGORY_LABELS[category],
    summary: input.summary || null,
    tags: normalizeTags(input.tags),
    confidence: clampConfidence(input.confidence),
    status: input.status,
    model: input.model || null,
    error_message: input.errorMessage || null,
    analyzed_at: input.analyzedAt ?? (input.status === 'pending' ? null : now),
  };

  const supabase = getSupabaseAdminClient() as any;
  const { error } = await supabase
    .from('prompt_purpose_analyses')
    .upsert(payload, { onConflict: 'task_type,task_id' });

  if (error) {
    throw new Error(`Failed to upsert prompt purpose analysis: ${error.message}`);
  }
}
