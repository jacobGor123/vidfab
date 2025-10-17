#!/bin/bash

# 视频压缩脚本
# 用法: ./scripts/compress-video.sh <input_file> [quality]
# quality: high (高质量), medium (中等), low (低质量), 默认 medium

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 检查参数
if [ $# -lt 1 ]; then
    echo -e "${RED}错误: 请提供输入文件路径${NC}"
    echo "用法: $0 <input_file> [quality]"
    echo "quality 选项: high (高质量), medium (中等), low (低质量), 默认 medium"
    exit 1
fi

INPUT_FILE="$1"
QUALITY="${2:-medium}"

# 检查文件是否存在
if [ ! -f "$INPUT_FILE" ]; then
    echo -e "${RED}错误: 文件不存在: $INPUT_FILE${NC}"
    exit 1
fi

# 检查 ffmpeg 是否安装
if ! command -v ffmpeg &> /dev/null; then
    echo -e "${RED}错误: ffmpeg 未安装${NC}"
    echo "请安装 ffmpeg: brew install ffmpeg"
    exit 1
fi

# 生成输出文件名
FILENAME=$(basename "$INPUT_FILE")
DIRNAME=$(dirname "$INPUT_FILE")
NAME="${FILENAME%.*}"
EXT="${FILENAME##*.}"
OUTPUT_FILE="${DIRNAME}/${NAME}_compressed.${EXT}"

# 根据质量设置参数
case "$QUALITY" in
    high)
        CRF=23
        PRESET="slow"
        AUDIO_BITRATE="128k"
        echo -e "${GREEN}使用高质量压缩模式 (CRF=23)${NC}"
        ;;
    medium)
        CRF=28
        PRESET="medium"
        AUDIO_BITRATE="96k"
        echo -e "${GREEN}使用中等质量压缩模式 (CRF=28)${NC}"
        ;;
    low)
        CRF=32
        PRESET="fast"
        AUDIO_BITRATE="64k"
        echo -e "${GREEN}使用低质量压缩模式 (CRF=32)${NC}"
        ;;
    *)
        echo -e "${RED}错误: 无效的质量参数: $QUALITY${NC}"
        echo "可选: high, medium, low"
        exit 1
        ;;
esac

# 获取原始文件信息
echo -e "${YELLOW}原始文件信息:${NC}"
ls -lh "$INPUT_FILE" | awk '{print "大小: " $5}'
ffmpeg -i "$INPUT_FILE" 2>&1 | grep -E "Duration|Video:" | head -2

echo ""
echo -e "${YELLOW}开始压缩...${NC}"

# 执行压缩
ffmpeg -i "$INPUT_FILE" \
    -c:v libx264 \
    -crf $CRF \
    -preset $PRESET \
    -c:a aac \
    -b:a $AUDIO_BITRATE \
    -movflags +faststart \
    "$OUTPUT_FILE" \
    -y 2>&1 | grep -E "frame=|video:|audio:|time="

echo ""
echo -e "${GREEN}✓ 压缩完成!${NC}"
echo ""
echo -e "${YELLOW}压缩结果对比:${NC}"
ORIGINAL_SIZE=$(stat -f%z "$INPUT_FILE")
COMPRESSED_SIZE=$(stat -f%z "$OUTPUT_FILE")
REDUCTION=$(echo "scale=2; 100 - ($COMPRESSED_SIZE * 100 / $ORIGINAL_SIZE)" | bc)

echo "原始文件: $(ls -lh "$INPUT_FILE" | awk '{print $5}')"
echo "压缩后:   $(ls -lh "$OUTPUT_FILE" | awk '{print $5}')"
echo -e "压缩率:   ${GREEN}${REDUCTION}%${NC}"
echo ""
echo -e "${GREEN}输出文件: $OUTPUT_FILE${NC}"
