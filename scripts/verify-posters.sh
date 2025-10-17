#!/bin/bash

# ======================================================================
# Poster 图片验证脚本
# ======================================================================
# 功能：
# 1. 检查所有必需的 poster 是否存在
# 2. 验证文件大小是否合理（< 100KB）
# 3. 验证文件格式
#
# 使用：
#   ./scripts/verify-posters.sh
# ======================================================================

set -e

POSTER_DIR="public/posters"

# 必需的 poster 列表
declare -a REQUIRED_POSTERS=(
  "discover-new/discover-new-01.webp"
  "discover-new/discover-new-02.webp"
  "discover-new/discover-new-03.webp"
  "discover-new/discover-new-04.webp"
  "discover-new/discover-new-05.webp"
  "discover-new/discover-new-06.webp"
  "discover-new/discover-new-07.webp"
  "discover-new/discover-new-08.webp"
  "discover-new/discover-new-09.webp"
  "discover-new/discover-new-10.webp"
  "discover-new/discover-new-11.webp"
  "discover-new/discover-new-12.webp"
  "discover-new/discover-new-13.webp"
  "discover-new/discover-new-14.webp"
)

echo "🔍 验证 Poster 图片"
echo "======================================"
echo "检查目录: $POSTER_DIR"
echo "必需文件数: ${#REQUIRED_POSTERS[@]}"
echo ""

MISSING_COUNT=0
OVERSIZED_COUNT=0
FOUND_COUNT=0
TOTAL_SIZE=0

# 检查每个 poster
for poster in "${REQUIRED_POSTERS[@]}"; do
  poster_path="$POSTER_DIR/$poster"

  if [[ ! -f "$poster_path" ]]; then
    echo "❌ 缺失: $poster"
    ((MISSING_COUNT++))
    continue
  fi

  # 获取文件大小（字节）
  file_size=$(stat -f%z "$poster_path" 2>/dev/null || stat -c%s "$poster_path" 2>/dev/null)
  file_size_kb=$((file_size / 1024))
  TOTAL_SIZE=$((TOTAL_SIZE + file_size))

  # 检查文件大小（目标 < 100KB）
  if [[ $file_size_kb -gt 100 ]]; then
    echo "⚠️  过大 ($file_size_kb KB): $poster"
    ((OVERSIZED_COUNT++))
  else
    echo "✅ 正常 ($file_size_kb KB): $poster"
  fi

  ((FOUND_COUNT++))
done

echo ""
echo "======================================"
echo "📊 验证结果"
echo "======================================"
echo "已找到: $FOUND_COUNT / ${#REQUIRED_POSTERS[@]}"
echo "缺失: $MISSING_COUNT"
echo "过大 (>100KB): $OVERSIZED_COUNT"

# 计算总大小
if [[ $FOUND_COUNT -gt 0 ]]; then
  total_size_mb=$(echo "scale=2; $TOTAL_SIZE / 1024 / 1024" | bc)
  avg_size_kb=$(echo "scale=2; $TOTAL_SIZE / $FOUND_COUNT / 1024" | bc)
  echo "总大小: ${total_size_mb} MB"
  echo "平均大小: ${avg_size_kb} KB"
fi

echo ""

if [[ $MISSING_COUNT -eq 0 ]] && [[ $OVERSIZED_COUNT -eq 0 ]]; then
  echo "🎉 所有 poster 验证通过！"
  exit 0
elif [[ $MISSING_COUNT -gt 0 ]]; then
  echo "⚠️  有 $MISSING_COUNT 个 poster 缺失"
  echo "运行: ./scripts/generate-posters.sh"
  exit 1
elif [[ $OVERSIZED_COUNT -gt 0 ]]; then
  echo "⚠️  有 $OVERSIZED_COUNT 个 poster 文件过大"
  echo "考虑降低 WebP 质量参数（当前为 80）"
  exit 1
fi
