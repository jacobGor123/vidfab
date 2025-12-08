#!/bin/bash
# 检查特效资源生成进度

cd "$(dirname "$0")/.."

VIDEO_COUNT=$(ls static/video-effects/*_video.mp4 2>/dev/null | wc -l | tr -d ' ')
POSTER_COUNT=$(ls static/video-effects/*_poster.webp 2>/dev/null | wc -l | tr -d ' ')
TOTAL=31

PROGRESS=$(awk "BEGIN {printf \"%.1f\", ($VIDEO_COUNT/$TOTAL)*100}")

echo "==================================="
echo "🎬 Pixverse V5 特效生成进度"
echo "==================================="
echo "📹 视频文件: $VIDEO_COUNT / $TOTAL"
echo "🖼️  海报文件: $POSTER_COUNT / $TOTAL"
echo "📊 完成进度: $PROGRESS%"
echo ""
echo "最新生成的文件:"
ls -lt static/video-effects/ | head -6 | tail -5
echo ""

if [ "$VIDEO_COUNT" -eq "$TOTAL" ]; then
    echo "✅ 所有特效已生成完成！"
else
    REMAINING=$((TOTAL - VIDEO_COUNT))
    echo "⏳ 剩余 $REMAINING 个特效待生成"
    echo "💡 运行 'tail -f generation.log' 查看详细日志"
fi
