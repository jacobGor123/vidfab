#!/bin/bash

# ===========================================
# VidFab AI Video Platform
# 云原生开发环境启动脚本
# ===========================================
# 功能：启动 Next.js 开发服务器 + BullMQ Worker
# 架构：Upstash Redis + Inngest 任务队列 + BullMQ 队列 + Cloudinary 视频处理
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
echo -e "${PURPLE}🚀 VidFab AI 云原生开发环境启动中...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo -e "${CYAN}☁️  架构：Upstash Redis + Inngest Queue + BullMQ Worker + Cloudinary${NC}"
echo ""

# 创建必要的目录
mkdir -p logs

# 获取时间戳用于日志文件
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Worker PID（用于清理时关闭）
WORKER_PID=""

# ============================================
# 清理缓存和临时文件
# ============================================
echo ""
echo -e "${CYAN}🧹 清理缓存和临时文件...${NC}"

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
    echo -e "${YELLOW}🛑 收到停止信号，正在关闭开发服务器...${NC}"

    # 关闭 Worker
    if [ ! -z "$WORKER_PID" ] && kill -0 $WORKER_PID 2>/dev/null; then
        echo -e "${YELLOW}🛑 正在关闭 BullMQ Worker (PID: $WORKER_PID)...${NC}"
        kill $WORKER_PID 2>/dev/null || true
        sleep 1
        # 如果进程仍在运行，强制终止
        if kill -0 $WORKER_PID 2>/dev/null; then
            echo -e "${RED}   强制终止 Worker${NC}"
            kill -9 $WORKER_PID 2>/dev/null || true
        fi
        echo -e "${GREEN}✅ Worker 已关闭${NC}"
    fi

    echo -e "${GREEN}✅ 开发环境已关闭${NC}"
    exit 0
}

# 设置信号处理
trap cleanup SIGINT SIGTERM

# ============================================
# 验证云服务配置
# ============================================
echo ""
echo -e "${CYAN}🔍 验证云服务配置...${NC}"

# 检查环境变量文件
if [ ! -f ".env.local" ] && [ ! -f ".env" ]; then
    echo -e "${RED}❌ 未找到环境配置文件 (.env.local 或 .env)${NC}"
    echo -e "${YELLOW}💡 请先创建环境配置文件${NC}"
    exit 1
fi

echo -e "${GREEN}✅ 环境配置文件存在${NC}"

# 检查关键云服务配置
MISSING_SERVICES=""

# 检查 Upstash Redis (REST API)
if ! grep -q "UPSTASH_REDIS_REST_URL=" .env.local 2>/dev/null && ! grep -q "UPSTASH_REDIS_REST_URL=" .env 2>/dev/null; then
    MISSING_SERVICES="${MISSING_SERVICES}\n  ⚠️  Upstash Redis REST API (UPSTASH_REDIS_REST_URL)"
fi

# 检查 Redis Protocol URL (用于 BullMQ Worker)
if ! grep -q "UPSTASH_REDIS_URL=" .env.local 2>/dev/null && ! grep -q "REDIS_URL=" .env.local 2>/dev/null && ! grep -q "UPSTASH_REDIS_URL=" .env 2>/dev/null && ! grep -q "REDIS_URL=" .env 2>/dev/null; then
    MISSING_SERVICES="${MISSING_SERVICES}\n  ⚠️  Redis Protocol URL (UPSTASH_REDIS_URL 或 REDIS_URL) - BullMQ Worker 需要"
fi

# 检查 Inngest
if ! grep -q "INNGEST_EVENT_KEY=" .env.local 2>/dev/null && ! grep -q "INNGEST_EVENT_KEY=" .env 2>/dev/null; then
    MISSING_SERVICES="${MISSING_SERVICES}\n  ⚠️  Inngest Queue (INNGEST_EVENT_KEY)"
fi

if [ ! -z "$MISSING_SERVICES" ]; then
    echo -e "${YELLOW}⚠️  警告：部分云服务未配置:${NC}"
    echo -e "$MISSING_SERVICES"
    echo -e "${BLUE}💡 应用仍可启动，但相关功能可能受限${NC}"
    echo ""
else
    echo -e "${GREEN}✅ 云服务配置完整${NC}"
    echo -e "${BLUE}  • Upstash Redis (REST API) - 缓存和会话存储${NC}"
    echo -e "${BLUE}  • Upstash Redis (Protocol) - BullMQ 队列后端${NC}"
    echo -e "${BLUE}  • Inngest - 异步任务队列${NC}"
    echo -e "${BLUE}  • BullMQ Worker - 分镜图生成队列${NC}"
    echo -e "${BLUE}  • Cloudinary - 视频处理和CDN${NC}"
fi

# ============================================
# 启动 BullMQ Worker (后台运行)
# ============================================
echo ""
echo -e "${CYAN}⚙️  启动 BullMQ Worker...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# Worker 日志文件
WORKER_LOG="logs/worker-dev-$TIMESTAMP.log"

echo -e "${YELLOW}🔄 正在启动 Worker...${NC}"
echo -e "${BLUE}📝 Worker 日志: $WORKER_LOG${NC}"

# 在后台启动 Worker
pnpm worker:dev > "$WORKER_LOG" 2>&1 &
WORKER_PID=$!

# 等待 Worker 启动
sleep 2

# 检查 Worker 是否成功启动
if kill -0 $WORKER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Worker 已启动 (PID: $WORKER_PID)${NC}"
    echo -e "${BLUE}   处理任务: storyboard_generation${NC}"
else
    echo -e "${RED}❌ Worker 启动失败，请检查日志: $WORKER_LOG${NC}"
    echo -e "${YELLOW}⚠️  分镜图生成功能可能不可用${NC}"
    WORKER_PID=""
fi

echo -e "${BLUE}═══════════════════════════════════════${NC}"

# ============================================
# 启动 Next.js 开发服务器
# ============================================
echo ""
echo -e "${CYAN}🌐 启动 Next.js 开发服务器...${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"

# 启动 Next.js 开发服务器（前台运行，带日志）
echo -e "${YELLOW}🔄 正在启动 Next.js...${NC}"
echo ""
echo -e "${BLUE}📝 Next.js 日志: logs/nextjs-dev-$TIMESTAMP.log${NC}"
echo -e "${BLUE}📝 Worker 日志: $WORKER_LOG${NC}"
echo -e "${BLUE}🌐 本地地址: http://localhost:3000${NC}"
echo -e "${BLUE}═══════════════════════════════════════${NC}"
echo ""

# 直接在前台运行 Next.js，这样用户可以看到实时输出
pnpm dev 2>&1 | tee "logs/nextjs-dev-$TIMESTAMP.log"

# 如果执行到这里，说明 Next.js 进程已经结束
echo ""
echo -e "${YELLOW}🛑 Next.js 开发服务器已停止${NC}"

# 清理 Worker
if [ ! -z "$WORKER_PID" ] && kill -0 $WORKER_PID 2>/dev/null; then
    echo -e "${YELLOW}🛑 正在关闭 BullMQ Worker...${NC}"
    kill $WORKER_PID 2>/dev/null || true
    sleep 1
    if kill -0 $WORKER_PID 2>/dev/null; then
        kill -9 $WORKER_PID 2>/dev/null || true
    fi
    echo -e "${GREEN}✅ Worker 已关闭${NC}"
fi

echo -e "${GREEN}✅ 开发环境已关闭${NC}"