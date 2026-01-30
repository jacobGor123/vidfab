#!/bin/bash
# PM2 Worker 管理脚本
#
# 用法：
#   ./scripts/pm2-worker.sh start      # 启动 Worker
#   ./scripts/pm2-worker.sh stop       # 停止 Worker
#   ./scripts/pm2-worker.sh restart    # 重启 Worker
#   ./scripts/pm2-worker.sh status     # 查看状态
#   ./scripts/pm2-worker.sh logs       # 查看日志

set -e

# 加载环境变量
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

case "$1" in
  start)
    echo "🚀 启动 VidFab Worker (PM2)..."

    # 检查 PM2 是否已安装
    if ! command -v pm2 &> /dev/null; then
      echo "❌ PM2 未安装，正在安装..."
      npm install -g pm2
    fi

    # 启动 Worker
    pm2 start ecosystem.config.js --only vidfab-worker

    echo "✅ Worker 已启动"
    echo "💡 查看状态: pm2 status"
    echo "💡 查看日志: pm2 logs vidfab-worker"
    ;;

  stop)
    echo "⏹️  停止 VidFab Worker..."
    pm2 stop vidfab-worker
    echo "✅ Worker 已停止"
    ;;

  restart)
    echo "🔄 重启 VidFab Worker..."
    pm2 restart vidfab-worker
    echo "✅ Worker 已重启"
    ;;

  status)
    pm2 status vidfab-worker
    ;;

  logs)
    pm2 logs vidfab-worker --lines 50
    ;;

  delete)
    echo "🗑️  删除 Worker 进程..."
    pm2 delete vidfab-worker
    echo "✅ Worker 已删除"
    ;;

  *)
    echo "用法: $0 {start|stop|restart|status|logs|delete}"
    exit 1
    ;;
esac
