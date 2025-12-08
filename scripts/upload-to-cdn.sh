#!/bin/bash
# 上传特效资源到 CDN (Vercel Blob Storage)
#
# 使用方法:
#   1. 确保已安装 Vercel CLI: npm install -g vercel
#   2. 确保已登录: vercel login
#   3. 运行此脚本: bash scripts/upload-to-cdn.sh

cd "$(dirname "$0")/.."

SOURCE_DIR="static/video-effects"
TARGET_URL="https://static.vidfab.ai/video-effects"

echo "==================================="
echo "📤 上传特效资源到 CDN"
echo "==================================="
echo "📁 源目录: $SOURCE_DIR"
echo "🌐 目标 URL: $TARGET_URL"
echo ""

# 检查文件数量
VIDEO_COUNT=$(ls $SOURCE_DIR/*_video.mp4 2>/dev/null | wc -l | tr -d ' ')
POSTER_COUNT=$(ls $SOURCE_DIR/*_poster.webp 2>/dev/null | wc -l | tr -d ' ')

if [ "$VIDEO_COUNT" -ne 31 ] || [ "$POSTER_COUNT" -ne 31 ]; then
    echo "❌ 错误：文件不完整"
    echo "   视频文件: $VIDEO_COUNT / 31"
    echo "   海报文件: $POSTER_COUNT / 31"
    echo ""
    echo "请先运行生成脚本完成所有文件生成："
    echo "   bash scripts/auto-generate-all-effects.sh"
    exit 1
fi

echo "✅ 文件检查通过: $VIDEO_COUNT 视频 + $POSTER_COUNT 海报"
echo ""

# TODO: 这里需要根据实际的 CDN 服务配置上传命令
# 示例命令（需要根据实际情况调整）：

echo "📋 上传方法选项："
echo ""
echo "方法 1: 使用 Vercel Blob Storage"
echo "----------------------------------------"
echo "# 安装 Vercel CLI"
echo "npm install -g vercel"
echo ""
echo "# 上传文件"
echo "cd $SOURCE_DIR"
echo "for file in *.mp4 *.webp; do"
echo "  vercel blob upload \$file --token=\$VERCEL_TOKEN"
echo "done"
echo ""

echo "方法 2: 使用 AWS S3"
echo "----------------------------------------"
echo "# 安装 AWS CLI"
echo "brew install awscli"
echo ""
echo "# 配置 AWS"
echo "aws configure"
echo ""
echo "# 上传文件"
echo "aws s3 sync $SOURCE_DIR s3://your-bucket/video-effects/ --acl public-read"
echo ""

echo "方法 3: 使用 Cloudflare R2"
echo "----------------------------------------"
echo "# 安装 Wrangler"
echo "npm install -g wrangler"
echo ""
echo "# 上传文件"
echo "wrangler r2 object put video-effects/\$filename --file=\$filepath"
echo ""

echo "方法 4: 手动上传到现有 CDN"
echo "----------------------------------------"
echo "如果您已经有 CDN 服务，请手动上传以下目录："
echo "  $SOURCE_DIR"
echo "到您的 CDN，确保文件可通过以下 URL 访问："
echo "  $TARGET_URL/{filename}"
echo ""

echo "💡 提示：上传完成后，请验证所有文件都可以访问："
echo "   bash scripts/verify-cdn-urls.sh"
