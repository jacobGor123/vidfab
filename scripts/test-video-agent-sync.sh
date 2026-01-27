#!/bin/bash

##############################################################################
# Video Agent - enqueue sync job (non-interactive)
#
# Usage:
#   PROJECT_ID=... USER_ID=... ./scripts/test-video-agent-sync.sh
##############################################################################

set -e

if [ -z "$PROJECT_ID" ]; then
  echo "❌ PROJECT_ID is required"
  exit 1
fi

if [ -z "$USER_ID" ]; then
  echo "❌ USER_ID is required (used for queue job payload)"
  exit 1
fi

echo "🚀 Enqueue va_sync_video_status for project=$PROJECT_ID"

mkdir -p logs
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="logs/video-agent-sync-$TIMESTAMP.log"

echo "📝 Logging to: $LOG_FILE"

# We enqueue directly via a tiny inline tsx script to avoid needing auth cookies.
npx tsx -e '
  import { Queue } from "bullmq"
  import { redisBullMQ } from "./lib/redis-bullmq"

  async function main() {
    const projectId = process.env.PROJECT_ID!
    const userId = process.env.USER_ID!
    const now = new Date().toISOString()
    const jobId = `va:sync:${projectId}`

    const queueName = process.env.QUEUE_PREFIX || "vidfab-video-processing"
    const queue = new Queue(queueName, { connection: redisBullMQ })

    const job = await queue.add(
      "va_sync_video_status",
      {
        type: "va_sync_video_status",
        jobId,
        userId,
        videoId: projectId,
        projectId,
        createdAt: now,
      } as any,
      {
        jobId,
        priority: 3,
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 50,
        removeOnFail: 20,
      }
    )

    await queue.close()
    console.log(JSON.stringify({ queuedJobId: job.id || jobId, projectId }, null, 2))
  }

  main().catch((err) => {
    console.error(err)
    process.exit(1)
  })
' 2>&1 | tee "$LOG_FILE"

echo "✅ Enqueued. Now run worker via: scripts/start-queue-worker.sh"
