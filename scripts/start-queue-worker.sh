#!/bin/bash
# 启动 BullMQ Worker for VidFab Video Processing

set -e

echo "🚀 Starting BullMQ Worker for VidFab..."

# 加载环境变量
if [ -f .env.local ]; then
  echo "Loading environment variables from .env.local..."
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# 验证必需的环境变量
if [ -z "$BULLMQ_REDIS_URL" ] && [ -z "$UPSTASH_REDIS_URL" ] && [ -z "$REDIS_URL" ]; then
  echo "❌ Error: No Redis configuration found!"
  echo "Please set one of the following environment variables:"
  echo "  - BULLMQ_REDIS_URL (recommended for BullMQ)"
  echo "  - UPSTASH_REDIS_URL (for Upstash Redis Protocol)"
  echo "  - REDIS_URL (fallback)"
  exit 1
fi

echo "✅ Environment variables loaded"

# 启动 Worker
echo "Starting worker..."
npx tsx worker/queue-worker.ts
