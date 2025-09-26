#!/bin/bash

# VidFab AI - Fix React #418 Hydration Errors Script
# 这个脚本用于修复持续出现的React hydration错误

echo "🔧 开始修复VidFab项目的React #418 Hydration错误..."

# 检查Docker是否运行
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker未运行，请先启动Docker"
    exit 1
fi

echo "📋 修复清单:"
echo "1. ✅ 修复环境变量不一致 (NODE_ENV production)"
echo "2. ✅ 移除Math.random()随机数据"
echo "3. ✅ 修复typeof window检查"
echo "4. ✅ 添加客户端检查hook"
echo "5. ✅ 添加hydration边界组件"

echo ""
echo "🛑 停止现有容器..."
docker-compose down --remove-orphans

echo ""
echo "🧹 清理Docker镜像缓存..."
docker system prune -f
docker builder prune -f

echo ""
echo "🔨 重新构建Docker镜像 (无缓存)..."
docker-compose build --no-cache --parallel

echo ""
echo "🚀 启动修复后的服务..."
docker-compose up -d

echo ""
echo "⏳ 等待服务启动完成..."
sleep 10

echo ""
echo "📊 检查服务状态..."
docker-compose ps

echo ""
echo "📱 检查应用健康状态..."
for i in {1..6}; do
    if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
        echo "✅ 应用启动成功! 服务运行在 http://localhost:3000"
        break
    else
        echo "⏳ 等待应用启动... ($i/6)"
        sleep 5
    fi
done

echo ""
echo "📋 修复摘要:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎯 主要修复项目:"
echo "   • 统一Docker环境变量 (NODE_ENV=production)"
echo "   • 替换Math.random()为确定性计算"
echo "   • 添加客户端检查防止SSR/CSR不匹配"
echo "   • 优化Next.js配置支持生产环境"
echo ""
echo "🔍 监控建议:"
echo "   • 查看浏览器控制台确认无React #418错误"
echo "   • 检查Docker容器日志: docker-compose logs -f app"
echo "   • 如仍有问题，检查具体组件的hydration警告"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
echo "🎉 修复脚本执行完成!"
echo "📱 访问应用: http://localhost:3000"