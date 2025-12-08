#!/bin/bash
# 自动生成所有特效资源

cd "$(dirname "$0")/.."
source venv/bin/activate

# 设置环境变量
export WAVESPEED_API_KEY="a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929"

echo "🎬 开始生成所有 31 个 Pixverse V5 特效资源..."
echo "📁 输出目录: static/video-effects/"
echo "⏱️  预计耗时: 1-2 小时"
echo ""

# 自动回答 "yes" 给脚本
echo "" | python3 scripts/generate-video-effects-assets.py

echo ""
echo "✅ 生成完成！"
echo "📊 查看生成的文件:"
ls -lh static/video-effects/ | wc -l
