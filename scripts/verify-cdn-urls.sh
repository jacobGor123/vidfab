#!/bin/bash
# 验证 CDN 上的所有特效资源 URL 是否可访问

cd "$(dirname "$0")/.."

CDN_BASE_URL="https://static.vidfab.ai/video-effects"

echo "==================================="
echo "🔍 验证 CDN 资源可访问性"
echo "==================================="
echo "🌐 CDN 地址: $CDN_BASE_URL"
echo ""

# 从 video-effects.ts 文件中读取所有特效 ID
EFFECTS_FILE="lib/constants/video-effects.ts"

if [ ! -f "$EFFECTS_FILE" ]; then
    echo "❌ 错误：找不到特效定义文件 $EFFECTS_FILE"
    exit 1
fi

# 提取所有 effect ID
EFFECT_IDS=$(grep -o 'id: "[^"]*"' "$EFFECTS_FILE" | sed 's/id: "\(.*\)"/\1/')

SUCCESS_COUNT=0
FAIL_COUNT=0
FAILED_FILES=()

echo "开始验证..."
echo ""

for id in $EFFECT_IDS; do
    VIDEO_URL="${CDN_BASE_URL}/${id}_video.mp4"
    POSTER_URL="${CDN_BASE_URL}/${id}_poster.webp"

    # 验证视频
    VIDEO_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$VIDEO_URL")
    if [ "$VIDEO_STATUS" -eq 200 ]; then
        echo "✅ $id (视频)"
        ((SUCCESS_COUNT++))
    else
        echo "❌ $id (视频) - HTTP $VIDEO_STATUS"
        FAILED_FILES+=("$VIDEO_URL")
        ((FAIL_COUNT++))
    fi

    # 验证海报
    POSTER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$POSTER_URL")
    if [ "$POSTER_STATUS" -eq 200 ]; then
        echo "✅ $id (海报)"
        ((SUCCESS_COUNT++))
    else
        echo "❌ $id (海报) - HTTP $POSTER_STATUS"
        FAILED_FILES+=("$POSTER_URL")
        ((FAIL_COUNT++))
    fi

    sleep 0.5  # 避免请求过快
done

echo ""
echo "==================================="
echo "📊 验证结果"
echo "==================================="
echo "✅ 成功: $SUCCESS_COUNT"
echo "❌ 失败: $FAIL_COUNT"

if [ "$FAIL_COUNT" -gt 0 ]; then
    echo ""
    echo "失败的 URL:"
    for url in "${FAILED_FILES[@]}"; do
        echo "  - $url"
    done
    exit 1
else
    echo ""
    echo "🎉 所有资源都可正常访问！"
    exit 0
fi
