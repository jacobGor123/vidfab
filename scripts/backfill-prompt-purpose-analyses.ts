import * as nextEnv from '@next/env';

import type { TaskType } from '../types/admin/tasks';

const loadEnvConfig = nextEnv.loadEnvConfig || (nextEnv as any).default?.loadEnvConfig;

loadEnvConfig(process.cwd());

function readNumberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function readTaskType(): TaskType | undefined {
  const arg = process.argv.find((item) => item.startsWith('--type='));
  const value = arg?.slice('--type='.length);

  if (value === 'video_generation' || value === 'image_generation') {
    return value;
  }

  return undefined;
}

async function main() {
  const { analyzeRecentPromptPurposes } = await import('../lib/admin/prompt-purpose-analyzer');
  const days = readNumberEnv('PROMPT_PURPOSE_BACKFILL_DAYS', 10);
  const limit = readNumberEnv('PROMPT_PURPOSE_BACKFILL_CANDIDATE_LIMIT', 1000);
  const analysisLimit = readNumberEnv('PROMPT_PURPOSE_BACKFILL_ANALYSIS_LIMIT', 10);
  const maxRounds = readNumberEnv('PROMPT_PURPOSE_BACKFILL_MAX_ROUNDS', 50);
  const taskType = readTaskType();

  const totals = {
    scanned: 0,
    analyzed: 0,
    reused: 0,
    skipped: 0,
    failed: 0,
    remaining: 0,
  };

  for (let round = 1; round <= maxRounds; round += 1) {
    const result = await analyzeRecentPromptPurposes({
      days,
      limit,
      analysisLimit,
      taskType,
    });

    totals.scanned = result.scanned;
    totals.analyzed += result.analyzed;
    totals.reused += result.reused;
    totals.skipped = result.skipped;
    totals.failed += result.failed;
    totals.remaining = result.remaining;

    console.log(
      `[PromptPurpose] round=${round} scanned=${result.scanned} analyzed=${result.analyzed} reused=${result.reused} skipped=${result.skipped} failed=${result.failed} remaining=${result.remaining}`
    );

    if (result.errors.length > 0) {
      for (const error of result.errors) {
        console.warn(
          `[PromptPurpose] ${error.taskType}:${error.taskId} failed: ${error.message}`
        );
      }
    }

    const progressed = result.analyzed + result.reused + result.failed;
    if (result.remaining === 0 || result.scanned === 0 || progressed === 0) {
      break;
    }
  }

  console.log('[PromptPurpose] backfill summary:', JSON.stringify(totals, null, 2));
}

main().catch((error) => {
  console.error('[PromptPurpose] backfill failed:', error);
  process.exit(1);
});
