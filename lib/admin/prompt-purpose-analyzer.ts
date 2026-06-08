import { GoogleGenerativeAI } from '@google/generative-ai';
import { getSupabaseAdminClient } from '@/models/db';
import { cleanJsonResponse } from '@/lib/services/video-agent/processors/analysis-utils';
import { MODEL_NAME } from '@/lib/services/video-agent/processors/script/constants';
import type {
  GenerationType,
  PromptPurposeCategory,
  TaskType,
} from '@/types/admin/tasks';
import {
  PROMPT_PURPOSE_CATEGORIES,
  PROMPT_PURPOSE_CATEGORY_LABELS,
  isPromptPurposeCategory,
} from '@/lib/admin/prompt-purpose-categories';
import {
  PromptPurposeCompletedFields,
  fetchAnalysesForTasks,
  fetchCompletedAnalysesByPromptHash,
  getPromptPurposeHash,
  upsertPromptPurposeAnalysis,
} from '@/lib/admin/prompt-purpose-store';

interface PromptPurposeCandidate {
  taskType: TaskType;
  taskId: string;
  userId: string | null;
  prompt: string;
  createdAt: string;
  generationType: GenerationType | null;
}

interface PromptPurposeModelResult extends PromptPurposeCompletedFields {}

export interface AnalyzeRecentPromptPurposesOptions {
  days?: number;
  limit?: number;
  taskType?: TaskType;
  force?: boolean;
}

export interface AnalyzeRecentPromptPurposesResult {
  scanned: number;
  analyzed: number;
  reused: number;
  skipped: number;
  failed: number;
  errors: Array<{
    taskType: TaskType;
    taskId: string;
    message: string;
  }>;
}

const DEFAULT_ANALYSIS_DAYS = 10;
const DEFAULT_ANALYSIS_LIMIT = 30;
const MAX_ANALYSIS_LIMIT = 100;
const MAX_PROMPT_CHARS = 4000;

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  if (!genAI) {
    genAI = new GoogleGenerativeAI(apiKey);
  }

  return genAI;
}

function getAnalysisModelName(): string {
  return process.env.PROMPT_PURPOSE_MODEL || MODEL_NAME;
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_ANALYSIS_LIMIT;
  }

  return Math.min(Math.floor(value), MAX_ANALYSIS_LIMIT);
}

function normalizeDays(value: number | undefined): number {
  if (!Number.isFinite(value) || !value || value < 1) {
    return DEFAULT_ANALYSIS_DAYS;
  }

  return Math.min(Math.floor(value), 30);
}

function normalizePrompt(prompt: string): string {
  return prompt.trim().slice(0, MAX_PROMPT_CHARS);
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function clampConfidence(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return Math.max(0, Math.min(1, parsed));
}

function determineVideoGenerationType(settings: any): GenerationType {
  const type = settings?.generationType;
  if (type === 'image-to-video' || type === 'image_to_video') return 'image_to_video';
  if (type === 'video-effects' || type === 'video_effects') return 'video_effects';
  return 'text_to_video';
}

function determineImageGenerationType(type: unknown): GenerationType {
  if (type === 'image-to-image' || type === 'image_to_image') {
    return 'image_to_image';
  }
  return 'text_to_image';
}

function buildAnalysisPrompt(candidate: PromptPurposeCandidate): string {
  const categoryLines = PROMPT_PURPOSE_CATEGORIES
    .map((category) => `- ${category}: ${PROMPT_PURPOSE_CATEGORY_LABELS[category]}`)
    .join('\n');

  return `You classify why a user wrote an AI video/image generation prompt.

Return strict JSON only. Do not include markdown.

Allowed categories:
${categoryLines}

Output schema:
{
  "category": "one allowed category key",
  "label": "short English label, max 4 words",
  "confidence": 0.0,
  "summary": "one short English sentence explaining the user's likely creative purpose",
  "tags": ["2-5 short English tags"]
}

Rules:
- Classify the user's creative purpose, not the visual style only.
- Use "image_editing_request" when the prompt asks to modify, transform, restore, upscale, swap, or edit an existing image.
- Use "other" only when no category fits.
- Keep summary neutral and do not include personal data.

Task type: ${candidate.taskType}
Generation type: ${candidate.generationType || 'unknown'}
Prompt:
${normalizePrompt(candidate.prompt)}`;
}

async function analyzePromptPurpose(
  candidate: PromptPurposeCandidate
): Promise<PromptPurposeModelResult> {
  const modelName = getAnalysisModelName();
  const model = getGeminiClient().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      maxOutputTokens: 1024,
      responseMimeType: 'application/json',
    },
  });

  const result = await model.generateContent(buildAnalysisPrompt(candidate));
  const response = await result.response;
  const content = response.text();

  if (!content) {
    throw new Error('Empty response from Gemini');
  }

  const parsed = JSON.parse(cleanJsonResponse(content));
  const category: PromptPurposeCategory = isPromptPurposeCategory(parsed.category)
    ? parsed.category
    : 'other';

  return {
    category,
    label: typeof parsed.label === 'string' && parsed.label.trim()
      ? parsed.label.trim().slice(0, 48)
      : PROMPT_PURPOSE_CATEGORY_LABELS[category],
    summary: typeof parsed.summary === 'string' && parsed.summary.trim()
      ? parsed.summary.trim().slice(0, 280)
      : null,
    tags: normalizeTags(parsed.tags),
    confidence: clampConfidence(parsed.confidence),
    model: modelName,
  };
}

async function fetchRecentVideoCandidates(cutoffIso: string, limit: number): Promise<PromptPurposeCandidate[]> {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from('user_videos')
    .select('id, user_id, prompt, created_at, settings')
    .gte('created_at', cutoffIso)
    .neq('status', 'deleted')
    .not('prompt', 'is', null)
    .neq('prompt', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent video prompts: ${error.message}`);
  }

  return (data ?? [])
    .filter((row: any) => typeof row.prompt === 'string' && row.prompt.trim())
    .map((row: any) => ({
      taskType: 'video_generation' as const,
      taskId: row.id,
      userId: row.user_id || null,
      prompt: row.prompt,
      createdAt: row.created_at,
      generationType: determineVideoGenerationType(row.settings || {}),
    }));
}

async function fetchRecentImageCandidates(cutoffIso: string, limit: number): Promise<PromptPurposeCandidate[]> {
  const supabase = getSupabaseAdminClient() as any;
  const { data, error } = await supabase
    .from('user_images')
    .select('id, user_id, prompt, created_at, generation_type')
    .gte('created_at', cutoffIso)
    .neq('status', 'deleted')
    .not('prompt', 'is', null)
    .neq('prompt', '')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch recent image prompts: ${error.message}`);
  }

  return (data ?? [])
    .filter((row: any) => typeof row.prompt === 'string' && row.prompt.trim())
    .map((row: any) => ({
      taskType: 'image_generation' as const,
      taskId: row.id,
      userId: row.user_id || null,
      prompt: row.prompt,
      createdAt: row.created_at,
      generationType: determineImageGenerationType(row.generation_type),
    }));
}

async function fetchRecentPromptCandidates(
  taskType: TaskType | undefined,
  days: number,
  limit: number
): Promise<PromptPurposeCandidate[]> {
  const cutoffIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  if (taskType === 'video_generation') {
    return fetchRecentVideoCandidates(cutoffIso, limit);
  }

  if (taskType === 'image_generation') {
    return fetchRecentImageCandidates(cutoffIso, limit);
  }

  const [videoCandidates, imageCandidates] = await Promise.all([
    fetchRecentVideoCandidates(cutoffIso, limit),
    fetchRecentImageCandidates(cutoffIso, limit),
  ]);

  return [...videoCandidates, ...imageCandidates]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function analyzeRecentPromptPurposes(
  options: AnalyzeRecentPromptPurposesOptions = {}
): Promise<AnalyzeRecentPromptPurposesResult> {
  if (!process.env.GOOGLE_AI_API_KEY) {
    throw new Error('GOOGLE_AI_API_KEY is not configured');
  }

  const days = normalizeDays(options.days);
  const limit = normalizeLimit(options.limit);
  const candidates = await fetchRecentPromptCandidates(options.taskType, days, limit);
  const existing = await fetchAnalysesForTasks(
    candidates.map((candidate) => ({
      taskType: candidate.taskType,
      taskId: candidate.taskId,
    }))
  );
  const hashes = candidates.map((candidate) => getPromptPurposeHash(candidate.prompt));
  const reusableByHash = options.force
    ? new Map<string, PromptPurposeCompletedFields>()
    : await fetchCompletedAnalysesByPromptHash(hashes);
  const runCache = new Map<string, PromptPurposeCompletedFields>();
  const result: AnalyzeRecentPromptPurposesResult = {
    scanned: candidates.length,
    analyzed: 0,
    reused: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  for (const candidate of candidates) {
    const promptHash = getPromptPurposeHash(candidate.prompt);
    const existingKey = `${candidate.taskType}:${candidate.taskId}`;
    const existingAnalysis = existing.get(existingKey);

    if (!options.force && existingAnalysis?.status === 'completed' && existingAnalysis.prompt_hash === promptHash) {
      result.skipped += 1;
      continue;
    }

    const reusable = !options.force
      ? runCache.get(promptHash) || reusableByHash.get(promptHash)
      : undefined;

    if (reusable) {
      await upsertPromptPurposeAnalysis({
        taskType: candidate.taskType,
        taskId: candidate.taskId,
        promptHash,
        status: 'completed',
        ...reusable,
      });
      result.reused += 1;
      continue;
    }

    try {
      const analysis = await analyzePromptPurpose(candidate);
      await upsertPromptPurposeAnalysis({
        taskType: candidate.taskType,
        taskId: candidate.taskId,
        promptHash,
        status: 'completed',
        ...analysis,
      });
      runCache.set(promptHash, analysis);
      result.analyzed += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown analysis error';
      await upsertPromptPurposeAnalysis({
        taskType: candidate.taskType,
        taskId: candidate.taskId,
        promptHash,
        status: 'failed',
        category: 'other',
        label: PROMPT_PURPOSE_CATEGORY_LABELS.other,
        confidence: 0,
        tags: [],
        model: getAnalysisModelName(),
        errorMessage: message.slice(0, 500),
      });
      result.failed += 1;
      result.errors.push({
        taskType: candidate.taskType,
        taskId: candidate.taskId,
        message,
      });
    }
  }

  return result;
}
