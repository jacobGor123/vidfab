#!/bin/bash

# ======================================================================
# 视频 Poster 图片生成脚本
# ======================================================================
# 功能：
# 1. 从 CDN 下载视频（如果本地不存在）
# 2. 提取视频第1秒的帧作为 poster
# 3. 转换为 WebP 格式并压缩（质量 80）
# 4. 保存到 public/posters/ 目录
#
# 使用：
#   ./scripts/generate-posters.sh              # 生成所有 poster
#   ./scripts/generate-posters.sh --force      # 强制重新生成
#   ./scripts/generate-posters.sh --dry-run    # 仅显示将要处理的文件
# ======================================================================

set -e

# 配置
CDN_BASE_URL="https://static.vidfab.ai"
POSTER_DIR="public/posters"
TEMP_DIR="tmp/videos"
FORCE_REGENERATE=false
DRY_RUN=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --force)
      FORCE_REGENERATE=true
      shift
      ;;
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    *)
      echo "未知参数: $1"
      echo "使用: $0 [--force] [--dry-run]"
      exit 1
      ;;
  esac
done

# 检查依赖
if ! command -v ffmpeg &> /dev/null; then
  echo "❌ 错误: 未安装 ffmpeg"
  echo "安装: brew install ffmpeg"
  exit 1
fi

if ! command -v cwebp &> /dev/null; then
  echo "❌ 错误: 未安装 cwebp"
  echo "安装: brew install webp"
  exit 1
fi

# 创建目录
mkdir -p "$POSTER_DIR"
mkdir -p "$POSTER_DIR/discover-new"
mkdir -p "$TEMP_DIR"

# 视频列表（从 components/sections/community-cta.tsx 提取）
declare -a VIDEOS=(
  "discover-new/discover-new-01.mp4"
  "discover-new/discover-new-02.mp4"
  "discover-new/discover-new-03.mp4"
  "discover-new/discover-new-04.mp4"
  "discover-new/discover-new-05.mp4"
  "discover-new/discover-new-06.mp4"
  "discover-new/discover-new-07.mp4"
  "discover-new/discover-new-08.mp4"
  "discover-new/discover-new-09.mp4"
  "discover-new/discover-new-10.mp4"
  "discover-new/discover-new-11.mp4"
  "discover-new/discover-new-12.mp4"
  "discover-new/discover-new-13.mp4"
  "discover-new/discover-new-14.mp4"
)

echo "🎬 视频 Poster 生成工具"
echo "======================================"
echo "总视频数: ${#VIDEOS[@]}"
echo "输出目录: $POSTER_DIR"
echo "强制重新生成: $FORCE_REGENERATE"
echo "试运行模式: $DRY_RUN"
echo ""

# 统计
TOTAL_COUNT=${#VIDEOS[@]}
PROCESSED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

# 处理每个视频
for video_path in "${VIDEOS[@]}"; do
  # 提取文件名（不含扩展名）
  filename=$(basename "$video_path" .mp4)
  subdir=$(dirname "$video_path")

  # 输出路径
  poster_path="$POSTER_DIR/$subdir/${filename}.webp"

  # 检查是否已存在
  if [[ -f "$poster_path" ]] && [[ "$FORCE_REGENERATE" == "false" ]]; then
    echo "⏭️  跳过（已存在）: $filename"
    ((SKIPPED_COUNT++))
    continue
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo "📋 将处理: $video_path → $poster_path"
    continue
  fi

  echo "🎥 处理: $filename..."

  # CDN 视频 URL
  video_url="$CDN_BASE_URL/$video_path"
  temp_video="$TEMP_DIR/$filename.mp4"
  temp_jpg="$TEMP_DIR/$filename.jpg"

  # 步骤 1: 下载视频（仅前 5 秒，节省带宽）
  echo "   📥 下载视频前 5 秒..."
  if ! curl -s -f -o "$temp_video" -r 0-5242880 "$video_url"; then
    echo "   ❌ 下载失败: $video_url"
    ((FAILED_COUNT++))
    rm -f "$temp_video"
    continue
  fi

  # 步骤 2: 提取第 1 秒的帧
  echo "   🖼️  提取第 1 秒帧..."
  if ! ffmpeg -i "$temp_video" -ss 00:00:01 -vframes 1 -q:v 2 "$temp_jpg" -y -loglevel error; then
    echo "   ❌ 提取帧失败: $filename"
    ((FAILED_COUNT++))
    rm -f "$temp_video" "$temp_jpg"
    continue
  fi

  # 步骤 3: 转换为 WebP 并压缩
  echo "   🗜️  转换为 WebP（质量 80）..."
  if ! cwebp -q 80 "$temp_jpg" -o "$poster_path" -quiet; then
    echo "   ❌ WebP 转换失败: $filename"
    ((FAILED_COUNT++))
    rm -f "$temp_video" "$temp_jpg"
    continue
  fi

  # 获取文件大小
  file_size=$(du -h "$poster_path" | cut -f1)

  echo "   ✅ 完成: $poster_path ($file_size)"
  ((PROCESSED_COUNT++))

  # 清理临时文件
  rm -f "$temp_video" "$temp_jpg"
done

echo ""
echo "======================================"
echo "📊 处理统计"
echo "======================================"
echo "总计: $TOTAL_COUNT"
echo "已处理: $PROCESSED_COUNT"
echo "已跳过: $SKIPPED_COUNT"
echo "失败: $FAILED_COUNT"
echo ""

if [[ "$DRY_RUN" == "true" ]]; then
  echo "💡 这是试运行模式，没有实际生成文件"
  echo "   运行 './scripts/generate-posters.sh' 开始生成"
elif [[ $FAILED_COUNT -gt 0 ]]; then
  echo "⚠️  部分文件处理失败，请检查日志"
  exit 1
elif [[ $PROCESSED_COUNT -gt 0 ]]; then
  echo "🎉 所有 poster 生成完成！"
  echo ""
  echo "📁 生成的文件位于: $POSTER_DIR/"
  echo ""
  echo "下一步："
  echo "1. 检查生成的 poster 质量"
  echo "2. 将 poster 上传到 CDN (https://static.vidfab.ai/posters/)"
  echo "3. 更新代码使用 poster（参考 docs/video-poster-optimization.md）"
else
  echo "✨ 所有文件都已是最新状态！"
fi

# 清理临时目录
rm -rf "$TEMP_DIR"
