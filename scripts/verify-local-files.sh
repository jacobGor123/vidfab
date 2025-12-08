#!/bin/bash
# 验证本地生成的特效资源文件

cd "$(dirname "$0")/.."

SOURCE_DIR="static/video-effects"

echo "==================================="
echo "🔍 验证本地文件完整性"
echo "==================================="
echo "📁 目录: $SOURCE_DIR"
echo ""

# 检查目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "❌ 错误：目录不存在 $SOURCE_DIR"
    exit 1
fi

# 从 video-effects.ts 文件中读取所有特效 ID
EFFECTS_FILE="lib/constants/video-effects.ts"

if [ ! -f "$EFFECTS_FILE" ]; then
    echo "❌ 错误：找不到特效定义文件 $EFFECTS_FILE"
    exit 1
fi

# 提取所有 effect ID
EFFECT_IDS=$(grep -o 'id: "[^"]*"' "$EFFECTS_FILE" | sed 's/id: "\(.*\)"/\1/')

TOTAL_COUNT=0
SUCCESS_COUNT=0
MISSING_COUNT=0
INVALID_COUNT=0

MISSING_FILES=()
INVALID_FILES=()

echo "开始验证文件..."
echo ""

for id in $EFFECT_IDS; do
    VIDEO_FILE="$SOURCE_DIR/${id}_video.mp4"
    POSTER_FILE="$SOURCE_DIR/${id}_poster.webp"

    # 验证视频文件
    ((TOTAL_COUNT++))
    if [ -f "$VIDEO_FILE" ]; then
        # 检查文件大小（应该大于 100KB）
        SIZE=$(stat -f%z "$VIDEO_FILE" 2>/dev/null || stat -c%s "$VIDEO_FILE" 2>/dev/null)
        if [ "$SIZE" -gt 102400 ]; then
            echo "✅ $id (视频: $(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
            ((SUCCESS_COUNT++))
        else
            echo "⚠️  $id (视频: 文件过小 - $SIZE bytes)"
            INVALID_FILES+=("$VIDEO_FILE (size: $SIZE)")
            ((INVALID_COUNT++))
        fi
    else
        echo "❌ $id (视频: 文件不存在)"
        MISSING_FILES+=("$VIDEO_FILE")
        ((MISSING_COUNT++))
    fi

    # 验证海报文件
    ((TOTAL_COUNT++))
    if [ -f "$POSTER_FILE" ]; then
        # 检查文件大小（应该大于 10KB）
        SIZE=$(stat -f%z "$POSTER_FILE" 2>/dev/null || stat -c%s "$POSTER_FILE" 2>/dev/null)
        if [ "$SIZE" -gt 10240 ]; then
            echo "✅ $id (海报: $(numfmt --to=iec-i --suffix=B $SIZE 2>/dev/null || echo "${SIZE} bytes"))"
            ((SUCCESS_COUNT++))
        else
            echo "⚠️  $id (海报: 文件过小 - $SIZE bytes)"
            INVALID_FILES+=("$POSTER_FILE (size: $SIZE)")
            ((INVALID_COUNT++))
        fi
    else
        echo "❌ $id (海报: 文件不存在)"
        MISSING_FILES+=("$POSTER_FILE")
        ((MISSING_COUNT++))
    fi
done

echo ""
echo "==================================="
echo "📊 验证结果"
echo "==================================="
echo "📝 总文件数: $TOTAL_COUNT (31 特效 × 2 文件 = 62)"
echo "✅ 有效文件: $SUCCESS_COUNT"
echo "❌ 缺失文件: $MISSING_COUNT"
echo "⚠️  异常文件: $INVALID_COUNT"

if [ "$MISSING_COUNT" -gt 0 ]; then
    echo ""
    echo "缺失的文件:"
    for file in "${MISSING_FILES[@]}"; do
        echo "  - $file"
    done
fi

if [ "$INVALID_COUNT" -gt 0 ]; then
    echo ""
    echo "异常的文件:"
    for file in "${INVALID_FILES[@]}"; do
        echo "  - $file"
    done
fi

if [ "$SUCCESS_COUNT" -eq "$TOTAL_COUNT" ]; then
    echo ""
    echo "🎉 所有文件验证通过！"
    exit 0
else
    echo ""
    echo "⚠️  发现问题，请检查上述文件"
    exit 1
fi
