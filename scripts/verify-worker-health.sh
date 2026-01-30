#!/bin/bash
# 验证 Worker 健康状态脚本
#
# 用法：./scripts/verify-worker-health.sh

set -e

echo "🏥 VidFab Worker 健康检查"
echo "================================"
echo ""

# 1. 检查 PM2 是否安装
echo "1️⃣  检查 PM2 安装状态..."
if command -v pm2 &> /dev/null; then
  echo "   ✅ PM2 已安装 ($(pm2 --version))"
else
  echo "   ❌ PM2 未安装"
  echo "   💡 运行: npm install -g pm2"
  exit 1
fi
echo ""

# 2. 检查 Worker 是否运行
echo "2️⃣  检查 Worker 运行状态..."
if pm2 list | grep -q "vidfab-worker.*online"; then
  echo "   ✅ Worker 正在运行"

  # 获取运行时长
  uptime=$(pm2 jlist | jq -r '.[] | select(.name=="vidfab-worker") | .pm2_env.pm_uptime' | xargs -I {} date -r {} '+%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A")
  echo "   📊 启动时间: $uptime"

  # 获取重启次数
  restarts=$(pm2 jlist | jq -r '.[] | select(.name=="vidfab-worker") | .pm2_env.restart_time' 2>/dev/null || echo "0")
  echo "   🔄 重启次数: $restarts"

  # 获取内存占用
  memory=$(pm2 jlist | jq -r '.[] | select(.name=="vidfab-worker") | .monit.memory' 2>/dev/null || echo "0")
  memory_mb=$((memory / 1024 / 1024))
  echo "   💾 内存占用: ${memory_mb}MB"
else
  echo "   ❌ Worker 未运行"
  echo "   💡 运行: ./scripts/pm2-worker.sh start"
  exit 1
fi
echo ""

# 3. 检查 Redis 连接
echo "3️⃣  检查 Redis 连接..."
if redis-cli ping &> /dev/null; then
  echo "   ✅ Redis 运行正常"
else
  echo "   ❌ Redis 未运行或无法连接"
  echo "   💡 运行: redis-server"
  exit 1
fi
echo ""

# 4. 检查环境变量
echo "4️⃣  检查环境变量..."

if [ -f .env.local ]; then
  echo "   ✅ .env.local 存在"

  # 检查关键环境变量
  source .env.local

  if [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo "   ✅ SUPABASE_SERVICE_ROLE_KEY 已设置"
  else
    echo "   ❌ SUPABASE_SERVICE_ROLE_KEY 未设置"
  fi

  if [ -n "$SHOTSTACK_API_KEY" ]; then
    echo "   ✅ SHOTSTACK_API_KEY 已设置"
  else
    echo "   ❌ SHOTSTACK_API_KEY 未设置"
  fi

  if [ -n "$REDIS_HOST" ] || [ -n "$REDIS_URL" ]; then
    echo "   ✅ Redis 配置已设置"
  else
    echo "   ⚠️  Redis 配置未设置（可能使用默认值）"
  fi
else
  echo "   ❌ .env.local 不存在"
  exit 1
fi
echo ""

# 5. 检查健康检查日志
echo "5️⃣  检查健康检查运行状态..."
if pm2 logs vidfab-worker --nostream --lines 200 | grep -q "\[HealthCheck\]"; then
  echo "   ✅ 健康检查守护进程正在运行"

  # 获取最近的健康检查结果
  last_check=$(pm2 logs vidfab-worker --nostream --lines 50 | grep "\[HealthCheck\]" | tail -1)
  echo "   📝 最近检查: $last_check"
else
  echo "   ⚠️  未找到健康检查日志（可能刚启动）"
fi
echo ""

# 6. 检查日志文件
echo "6️⃣  检查日志文件..."
if [ -f logs/worker-out.log ]; then
  log_size=$(du -h logs/worker-out.log | cut -f1)
  echo "   ✅ Worker 日志存在 ($log_size)"

  # 检查是否有错误
  error_count=$(grep -c "Error\|Failed\|❌" logs/worker-out.log 2>/dev/null || echo "0")
  if [ "$error_count" -gt 0 ]; then
    echo "   ⚠️  发现 $error_count 个错误日志"
    echo "   💡 查看: tail -50 logs/worker-out.log"
  fi
else
  echo "   ⚠️  日志文件不存在"
fi
echo ""

# 7. 总结
echo "================================"
echo "✅ 健康检查完成"
echo ""
echo "📊 快速操作："
echo "   查看实时日志: pm2 logs vidfab-worker"
echo "   查看状态面板: pm2 monit"
echo "   重启 Worker: ./scripts/pm2-worker.sh restart"
echo ""
