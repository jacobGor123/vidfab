#!/bin/bash

##############################################################################
# Video Agent - Worker chain smoke test
#
# What it validates (minimum, non-interactive):
# 1) Redis reachable and worker can start
# 2) Enqueue va_sync_video_status job
# 3) Poll BullMQ for downstream video_clip_download jobs enqueued by sync handler
#
# Usage:
#   PROJECT_ID=... USER_ID=... ./scripts/test-video-agent-worker-chain.sh
#
# Notes:
# - Requires Redis env vars (same as scripts/start-queue-worker.sh)
# - Requires Supabase env vars (worker loads .env.local/.env)
##############################################################################

set -euo pipefail

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/video-agent-worker-chain-$TIMESTAMP.log"

echo "🧪 Running video-agent worker chain smoke test..."
echo "📝 Logging to: $LOG_FILE"

if [ -z "${PROJECT_ID:-}" ]; then
  echo "❌ PROJECT_ID is required" | tee -a "$LOG_FILE"
  exit 1
fi

if [ -z "${USER_ID:-}" ]; then
  echo "❌ USER_ID is required" | tee -a "$LOG_FILE"
  exit 1
fi

if [ ! -d logs ]; then
  mkdir -p logs
fi

echo "🔎 Preflight: verify Redis env..." | tee -a "$LOG_FILE"
if [ -z "${BULLMQ_REDIS_URL:-}" ] && [ -z "${UPSTASH_REDIS_URL:-}" ] && [ -z "${REDIS_URL:-}" ]; then
  if [ -f .env.local ]; then
    echo "Loading environment variables from .env.local..." | tee -a "$LOG_FILE"
    # shellcheck disable=SC2046
    export $(cat .env.local | grep -v '^#' | xargs)
  fi
fi

if [ -z "${BULLMQ_REDIS_URL:-}" ] && [ -z "${UPSTASH_REDIS_URL:-}" ] && [ -z "${REDIS_URL:-}" ]; then
  echo "❌ No Redis configuration found (BULLMQ_REDIS_URL / UPSTASH_REDIS_URL / REDIS_URL)" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🚀 Starting worker (background)..." | tee -a "$LOG_FILE"
nohup ./scripts/start-queue-worker.sh >> "$LOG_FILE" 2>&1 &
WORKER_PID=$!

cleanup() {
  echo "🛑 Stopping worker (pid=$WORKER_PID)..." | tee -a "$LOG_FILE"
  kill "$WORKER_PID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "⏳ Waiting for worker to boot..." | tee -a "$LOG_FILE"
sleep 2

if ! ps -p "$WORKER_PID" >/dev/null 2>&1; then
  echo "❌ Worker exited early. See log: $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "✅ Worker is running (pid=$WORKER_PID)" | tee -a "$LOG_FILE"

echo "📥 Enqueue va_sync_video_status..." | tee -a "$LOG_FILE"
PROJECT_ID="$PROJECT_ID" USER_ID="$USER_ID" ./scripts/test-video-agent-sync.sh >> "$LOG_FILE" 2>&1

if ! ps -p "$WORKER_PID" >/dev/null 2>&1; then
  echo "❌ Worker exited after enqueue. See log: $LOG_FILE" | tee -a "$LOG_FILE"
  exit 1
fi

echo "🔁 Polling queue for downstream video_clip_download jobs..." | tee -a "$LOG_FILE"

# We poll Redis/BullMQ via a tiny TS snippet to avoid relying on curl/jq or API auth.
MAX_ATTEMPTS=30
SLEEP_SECONDS=2

ATTEMPT=1
while [ "$ATTEMPT" -le "$MAX_ATTEMPTS" ]; do
  echo "Attempt $ATTEMPT/$MAX_ATTEMPTS" | tee -a "$LOG_FILE"

  FOUND=$(npx tsx -e '
    import { Queue } from "bullmq";
    import { redisBullMQ } from "./lib/redis-bullmq";

    async function main() {
      const queueName = process.env.QUEUE_PREFIX || "vidfab-video-processing";
      const q = new Queue(queueName, { connection: redisBullMQ });
      const jobs = await q.getJobs(["waiting","delayed","active"], 0, 200);
      const matches = jobs.filter(
        (j) => j.name === "video_clip_download" && (j.id || "").includes("va:clip:download:${PROJECT_ID}:")
      );
      console.log(String(matches.length));
      await q.close();
    }

    main().catch((err) => {
      console.error(err);
      process.exit(1);
    });
  ' 2>> "$LOG_FILE" || echo "0")

  if [ "${FOUND:-0}" != "0" ]; then
    echo "✅ Found downstream video_clip_download jobs: $FOUND" | tee -a "$LOG_FILE"
    echo "✅ worker chain smoke test: OK" | tee -a "$LOG_FILE"
    exit 0
  fi

  sleep "$SLEEP_SECONDS"
  ATTEMPT=$((ATTEMPT + 1))
done

echo "❌ Timed out: no downstream video_clip_download jobs observed." | tee -a "$LOG_FILE"
echo "See log: $LOG_FILE" | tee -a "$LOG_FILE"
exit 1
