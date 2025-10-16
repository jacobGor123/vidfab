#!/bin/bash

# ===========================================
# VidFab AI Video Platform
# 统一开发环境启动脚本
# ===========================================
# 功能：启动 Redis + 队列系统 + Next.js 开发服务器
# 使用：./scripts/dev.sh
# ===========================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${PURPLE}🚀 VidFab AI 开发环境启动中...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 创建必要的目录
mkdir -p logs

# 获取时间戳用于日志文件
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# PID 文件路径
REDIS_PID_FILE="logs/redis.pid"
QUEUE_PID_FILE="logs/queue-worker.pid"
NEXTJS_PID_FILE="logs/nextjs-dev.pid"

# ============================================
# 清理缓存和临时文件
# ============================================
echo ""
echo -e "${CYAN}🧹 清理缓存和临时文件...${NC}"

# 清理旧的 PID 文件
if [ -f "$REDIS_PID_FILE" ] || [ -f "$QUEUE_PID_FILE" ] || [ -f "$NEXTJS_PID_FILE" ]; then
    echo -e "${YELLOW}📝 清理旧的 PID 文件...${NC}"
    rm -f "$REDIS_PID_FILE" "$QUEUE_PID_FILE" "$NEXTJS_PID_FILE"
fi

# 清理 Next.js 缓存
if [ -d ".next" ]; then
    echo -e "${YELLOW}🗑️  清理 Next.js 构建缓存 (.next)...${NC}"
    rm -rf .next
    echo -e "${GREEN}✅ Next.js 缓存已清理${NC}"
fi

# 清理 node_modules 缓存
if [ -d "node_modules/.cache" ]; then
    echo -e "${YELLOW}🗑️  清理 node_modules 缓存...${NC}"
    rm -rf node_modules/.cache
    echo -e "${GREEN}✅ node_modules 缓存已清理${NC}"
fi

# 清理 TypeScript 缓存
if [ -f "tsconfig.tsbuildinfo" ]; then
    echo -e "${YELLOW}🗑️  清理 TypeScript 构建信息...${NC}"
    rm -f tsconfig.tsbuildinfo
    echo -e "${GREEN}✅ TypeScript 缓存已清理${NC}"
fi

# 清理超过 7 天的旧日志文件
if [ -d "logs" ]; then
    OLD_LOGS=$(find logs -type f -name "*.log" -mtime +7 2>/dev/null | wc -l)
    if [ "$OLD_LOGS" -gt 0 ]; then
        echo -e "${YELLOW}🗑️  清理超过 7 天的旧日志文件 ($OLD_LOGS 个文件)...${NC}"
        find logs -type f -name "*.log" -mtime +7 -delete 2>/dev/null
        echo -e "${GREEN}✅ 旧日志文件已清理${NC}"
    fi
fi

# 清理临时队列脚本文件
if [ -f "queue-worker.js" ]; then
    echo -e "${YELLOW}🗑️  清理临时队列脚本...${NC}"
    rm -f queue-worker.js
fi

echo -e "${GREEN}✅ 缓存清理完成${NC}"

# ============================================
# 清理占用的端口 (3000-3009)
# ============================================
echo ""
echo -e "${CYAN}🔍 检查并清理端口 3000-3009...${NC}"

# 函数：清理指定端口
kill_port() {
    local PORT=$1
    # 检查端口是否被占用
    if lsof -ti:$PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️  端口 $PORT 被占用，正在清理...${NC}"
        # 获取占用端口的进程 PID
        local PIDS=$(lsof -ti:$PORT 2>/dev/null)
        if [ ! -z "$PIDS" ]; then
            # 尝试优雅地终止进程
            for PID in $PIDS; do
                local PROCESS_NAME=$(ps -p $PID -o comm= 2>/dev/null || echo "unknown")
                echo -e "${BLUE}   终止进程: $PROCESS_NAME (PID: $PID)${NC}"
                kill $PID 2>/dev/null || true
            done
            # 等待进程退出
            sleep 1
            # 如果进程仍在运行，强制终止
            for PID in $PIDS; do
                if kill -0 $PID 2>/dev/null; then
                    echo -e "${RED}   强制终止 PID: $PID${NC}"
                    kill -9 $PID 2>/dev/null || true
                fi
            done
            echo -e "${GREEN}✅ 端口 $PORT 已清理${NC}"
        fi
    else
        echo -e "${GREEN}✅ 端口 $PORT 可用${NC}"
    fi
}

# 清理 3000-3009 端口
PORTS_CLEARED=0
for PORT in {3000..3009}; do
    if lsof -ti:$PORT > /dev/null 2>&1; then
        kill_port $PORT
        ((PORTS_CLEARED++))
    fi
done

if [ $PORTS_CLEARED -eq 0 ]; then
    echo -e "${GREEN}✅ 所有端口 (3000-3009) 都可用${NC}"
else
    echo -e "${GREEN}✅ 已清理 $PORTS_CLEARED 个占用的端口${NC}"
fi

# 清理函数
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 收到停止信号，正在优雅关闭所有服务...${NC}"

    # 停止 Next.js 开发服务器
    if [ -f "$NEXTJS_PID_FILE" ]; then
        NEXTJS_PID=$(cat "$NEXTJS_PID_FILE")
        if kill -0 "$NEXTJS_PID" 2>/dev/null; then
            echo -e "${CYAN}🔄 停止 Next.js 开发服务器 (PID: $NEXTJS_PID)...${NC}"
            kill "$NEXTJS_PID" 2>/dev/null || true
        fi
        rm -f "$NEXTJS_PID_FILE"
    fi

    # 停止队列工作进程
    if [ -f "$QUEUE_PID_FILE" ]; then
        QUEUE_PID=$(cat "$QUEUE_PID_FILE")
        if kill -0 "$QUEUE_PID" 2>/dev/null; then
            echo -e "${CYAN}🔄 停止队列工作进程 (PID: $QUEUE_PID)...${NC}"
            kill "$QUEUE_PID" 2>/dev/null || true
        fi
        rm -f "$QUEUE_PID_FILE"
    fi

    # 清理临时文件
    rm -f queue-worker.js

    echo -e "${GREEN}✅ 所有服务已停止${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# ============================================
# 1. 启动 Redis
# ============================================
echo ""
echo -e "${CYAN}📦 启动 Redis...${NC}"

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker 未运行，请先启动 Docker${NC}"
    echo -e "${YELLOW}💡 启动 Docker 后重新运行此脚本${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker 正在运行${NC}"

# 检查 Redis 容器是否已运行
if docker ps -q -f name=vidfab-redis | grep -q .; then
    echo -e "${GREEN}✅ Redis 容器已在运行${NC}"
else
    echo -e "${YELLOW}🔄 启动 Redis 容器...${NC}"

    # 尝试启动 Redis (兼容新旧版本的 Docker Compose)
    if command -v docker-compose >/dev/null 2>&1; then
        COMPOSE_CMD="docker-compose"
    else
        COMPOSE_CMD="docker compose"
    fi

    if $COMPOSE_CMD up -d redis; then
        echo -e "${GREEN}✅ Redis 启动成功！${NC}"
        sleep 3  # 等待 Redis 完全启动

        # 健康检查
        if docker exec vidfab-redis redis-cli ping > /dev/null 2>&1; then
            echo -e "${GREEN}✅ Redis 健康检查通过${NC}"
        else
            echo -e "${YELLOW}⚠️  Redis 健康检查失败，但容器已启动，继续执行...${NC}"
        fi
    else
        echo -e "${RED}❌ Redis 启动失败${NC}"
        echo -e "${YELLOW}💡 请检查 docker-compose.yml 配置${NC}"
        exit 1
    fi
fi

# ============================================
# 2. 启动队列工作进程 (可选)
# ============================================
echo ""
echo -e "${CYAN}⚡ 启动队列工作进程...${NC}"

# 初始化队列启动状态
QUEUE_STARTED=false

# 检查 Node.js 依赖
if [ ! -d "node_modules" ]; then
    echo -e "${RED}❌ Node.js 依赖未安装，跳过队列工作进程${NC}"
    echo -e "${YELLOW}💡 请先运行: pnpm install${NC}"
else
    echo -e "${GREEN}✅ Node.js 依赖已安装${NC}"

    # 检查 Redis 连接
    if docker exec vidfab-redis redis-cli ping > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Redis 连接正常${NC}"

        # 尝试启动队列工作进程
        echo -e "${YELLOW}🔄 启动队列工作进程...${NC}"

        # 创建队列工作进程脚本
        cat > queue-worker.js << 'EOF'
const { initializeQueueSystem, shutdownQueueSystem } = require('./lib/queue/index.ts');

async function startWorker() {
  try {
    await initializeQueueSystem();
    console.log('✅ Queue worker is running...');

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Received SIGINT, shutting down gracefully...');
      await shutdownQueueSystem();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log('🛑 Received SIGTERM, shutting down gracefully...');
      await shutdownQueueSystem();
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Failed to start queue worker:', error);
    process.exit(1);
  }
}

startWorker();
EOF

        # 启动队列工作进程（后台运行）
        if pnpm dlx ts-node queue-worker.js > logs/queue-worker-$TIMESTAMP.log 2>&1 &
        then
            QUEUE_PID=$!
            echo $QUEUE_PID > "$QUEUE_PID_FILE"

            # 检查队列进程是否正常启动
            sleep 2
            if kill -0 "$QUEUE_PID" 2>/dev/null; then
                echo -e "${GREEN}✅ 队列工作进程启动成功 (PID: $QUEUE_PID)${NC}"
                echo -e "${BLUE}📝 队列日志: logs/queue-worker-$TIMESTAMP.log${NC}"
                QUEUE_STARTED=true
            else
                echo -e "${YELLOW}⚠️  队列工作进程启动失败，但继续启动 Next.js${NC}"
                echo -e "${BLUE}📝 检查队列日志: logs/queue-worker-$TIMESTAMP.log${NC}"
                rm -f "$QUEUE_PID_FILE"
            fi
        else
            echo -e "${YELLOW}⚠️  无法启动队列工作进程，但继续启动 Next.js${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  Redis 连接失败，跳过队列工作进程${NC}"
    fi
fi

# ============================================
# 3. 启动 Next.js 开发服务器
# ============================================
echo ""
echo -e "${CYAN}🌐 启动 Next.js 开发服务器...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 启动 Next.js 开发服务器（前台运行，带日志）
echo -e "${YELLOW}🔄 正在启动 Next.js...${NC}"

# 直接在前台运行 Next.js，这样用户可以看到实时输出
pnpm dev 2>&1 | tee "logs/nextjs-dev-$TIMESTAMP.log"

# 如果执行到这里，说明 Next.js 进程已经结束
echo ""
echo -e "${YELLOW}🛑 Next.js 开发服务器已停止${NC}"

# 清理队列进程
if [ "$QUEUE_STARTED" = true ] && [ -f "$QUEUE_PID_FILE" ]; then
    QUEUE_PID=$(cat "$QUEUE_PID_FILE")
    if kill -0 "$QUEUE_PID" 2>/dev/null; then
        echo -e "${CYAN}🔄 停止队列工作进程...${NC}"
        kill "$QUEUE_PID" 2>/dev/null || true
    fi
    rm -f "$QUEUE_PID_FILE"
fi

# 清理临时文件
rm -f queue-worker.js

echo -e "${GREEN}✅ 开发环境已关闭${NC}"