#!/bin/bash

# 对比图片和视频的存储情况

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if [ -f .env.local ]; then
  echo "📝 加载 .env.local 环境变量..."
  export $(cat .env.local | grep -v '^#' | xargs)
elif [ -f .env ]; then
  echo "📝 加载 .env 环境变量..."
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔍 开始对比图片和视频的存储情况..."
npx tsx scripts/compare-image-video-storage.ts
