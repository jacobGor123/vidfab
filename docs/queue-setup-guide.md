# 队列系统配置指南

**VidFab AI Video Platform - BullMQ 队列系统**

本文档介绍如何配置和运行 BullMQ 队列系统（用于分镜图生成等后台任务）。

---

## 一、环境变量配置

### 1.1 Redis 配置（必需）

BullMQ 需要 Redis 作为消息队列后端。你有以下几种选择：

#### 选项 A：Upstash Redis（推荐 ⭐）

**适用场景**：生产环境、Serverless 部署

```bash
# .env.local 或 .env.product

# 方式 1：使用 Upstash Redis Protocol（推荐）
# 格式：rediss://default:password@hostname:6380
UPSTASH_REDIS_URL="rediss://default:YOUR_PASSWORD@ample-chimp-6539.upstash.io:6380"

# 或使用专用的 BullMQ Redis URL
BULLMQ_REDIS_URL="rediss://default:YOUR_PASSWORD@ample-chimp-6539.upstash.io:6380"
```

**如何获取 Upstash Redis Protocol URL？**

1. 登录 [Upstash Console](https://console.upstash.com/)
2. 选择你的 Redis 实例
3. 在 "Details" 页面找到：
   - **Endpoint**: `ample-chimp-6539.upstash.io`
   - **Port**: `6380` (Redis Protocol with TLS)
   - **Password**: `YOUR_PASSWORD`
4. 组合成 URL：`rediss://default:YOUR_PASSWORD@ample-chimp-6539.upstash.io:6380`

**注意**：
- ✅ 使用 `rediss://`（双 s）表示 TLS 加密连接
- ✅ 用户名固定为 `default`
- ✅ 端口为 `6380`（TLS），普通连接是 `6379`

---

#### 选项 B：本地 Redis（开发环境）

**适用场景**：本地开发、测试

```bash
# .env.local

# 使用完整 URL（推荐）
REDIS_URL="redis://localhost:6379"

# 或使用单独的配置项
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_DB="0"
# REDIS_PASSWORD="your_password"  # 如果需要密码
```

**安装 Redis**：

```bash
# macOS
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Docker
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

---

#### 选项 C：其他云 Redis 服务

**Railway、Render、AWS ElastiCache 等**

```bash
# 使用完整的 Redis URL
BULLMQ_REDIS_URL="redis://username:password@your-redis-host:6379"

# 或
REDIS_URL="redis://username:password@your-redis-host:6379"
```

---

### 1.2 队列配置（可选）

```bash
# .env.local

# 队列名称前缀（默认：vidfab-video-processing）
QUEUE_PREFIX="vidfab-video-processing"

# Worker 并发数（默认：3）
QUEUE_CONCURRENCY="3"

# 最大重试次数（默认：3）
QUEUE_MAX_RETRIES="3"

# 重试延迟（毫秒，默认：60000 = 1分钟）
QUEUE_RETRY_DELAY="60000"

# 分镜图生成并发数（默认：3）
STORYBOARD_CONCURRENCY="3"
```

---

## 二、启动 Worker

### 2.1 本地开发

#### 方法 1：使用 npm script（推荐）

```bash
# 启动 Worker
npm run worker

# 或使用热重载模式（开发时推荐）
npm run worker:dev
```

#### 方法 2：使用 Bash 脚本

```bash
# 赋予执行权限（首次）
chmod +x scripts/start-queue-worker.sh

# 启动 Worker
./scripts/start-queue-worker.sh
```

#### 方法 3：直接运行

```bash
npx tsx worker/queue-worker.ts
```

---

### 2.2 生产部署

#### 选项 A：Railway（推荐 ⭐）

**优势**：
- ✅ 24/7 运行
- ✅ 自动重启
- ✅ 免费额度（$5/月）
- ✅ 自动从 GitHub 部署

**步骤**：

1. **创建 Railway 项目**
   - 访问 [Railway](https://railway.app/)
   - 点击 "New Project" → "Deploy from GitHub repo"
   - 选择你的 vidfab 仓库

2. **配置启动命令**
   - 在 Railway 项目设置中
   - Build Command: `npm install`
   - Start Command: `npm run worker`

3. **配置环境变量**
   - 复制以下变量到 Railway（从 Vercel 或 .env.local）：
     ```
     UPSTASH_REDIS_URL=...
     SUPABASE_URL=...
     SUPABASE_SERVICE_KEY=...
     GOOGLE_AI_API_KEY=...
     BYTEPLUS_API_KEY=...
     # ... 其他必需的环境变量
     ```

4. **部署**
   - Railway 会自动部署并启动 Worker
   - 查看日志确认运行正常

---

#### 选项 B：Render

**步骤**：

1. 创建新的 Background Worker
2. 连接 GitHub 仓库
3. 配置：
   - Build Command: `npm install`
   - Start Command: `npm run worker`
4. 添加环境变量
5. 部署

---

#### 选项 C：Docker

**Dockerfile**（项目根目录已有）：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

CMD ["npm", "run", "worker"]
```

**部署**：

```bash
# 构建镜像
docker build -t vidfab-worker .

# 运行容器
docker run -d \
  --name vidfab-worker \
  --env-file .env.product \
  vidfab-worker

# 查看日志
docker logs -f vidfab-worker
```

---

#### 选项 D：PM2（VPS 服务器）

```bash
# 安装 PM2
npm install -g pm2

# 启动 Worker
pm2 start npm --name vidfab-worker -- run worker

# 查看状态
pm2 status

# 查看日志
pm2 logs vidfab-worker

# 设置开机自启
pm2 startup
pm2 save
```

---

## 三、验证配置

### 3.1 检查 Redis 连接

```bash
# 测试 Redis 连接
node -e "
const Redis = require('ioredis');
const redis = new Redis(process.env.BULLMQ_REDIS_URL || process.env.REDIS_URL);
redis.ping().then(r => console.log('Redis:', r)).catch(e => console.error('Error:', e));
"
```

预期输出：`Redis: PONG`

---

### 3.2 测试队列任务

1. **启动 Worker**

```bash
npm run worker
```

预期输出：
```
🚀 Starting VidFab BullMQ Worker...
Environment: development
✅ Worker started successfully
Waiting for jobs...
```

2. **触发分镜图生成**

- 在前端页面创建一个 video-agent 项目
- 完成脚本分析后，点击 "Generate Storyboards"
- 查看 Worker 日志，应该看到：

```
🔥 Processing job: storyboard_generation {...}
⏳ Progress: 10% - 正在生成第 1 张分镜...
⏳ Progress: 50% - 已完成 5/10 张分镜
✅ Completed: storyboard_generation {...}
```

---

## 四、监控和调试

### 4.1 查看队列统计

创建 API 端点：

```typescript
// app/api/admin/queue/stats/route.ts
import { videoQueueManager } from '@/lib/queue/queue-manager'
import { NextResponse } from 'next/server'

export async function GET() {
  const stats = await videoQueueManager.getQueueStats()
  const workerStatus = videoQueueManager.getWorkerStatus()

  return NextResponse.json({
    queue: stats,
    worker: workerStatus
  })
}
```

访问：`http://localhost:3000/api/admin/queue/stats`

---

### 4.2 查看任务状态

```typescript
// 在代码中
const jobId = await videoQueueManager.addJob(...)
const status = await videoQueueManager.getJobStatus(jobId)

console.log('Job status:', status)
```

---

### 4.3 常见问题排查

#### 问题 1：Worker 无法连接到 Redis

**症状**：
```
❌ Worker startup failed: Error: connect ECONNREFUSED...
```

**解决方案**：
1. 检查 Redis 是否运行：`redis-cli ping`
2. 检查环境变量是否正确
3. 检查防火墙设置

---

#### 问题 2：任务一直在 generating 状态

**症状**：
- 前端轮询显示 `generating`
- Worker 日志没有任何输出

**解决方案**：
1. 确认 Worker 是否在运行
2. 检查 Redis 连接
3. 查看 Worker 日志确认是否有错误

---

#### 问题 3：任务失败并重试

**症状**：
```
❌ Failed: storyboard_generation {...}
```

**解决方案**：
1. 查看错误消息
2. 检查 API Key 配置（Google AI、BytePlus）
3. 检查网络连接
4. 任务会自动重试最多 3 次

---

## 五、生产最佳实践

### 5.1 监控告警

建议集成监控工具：

- **Sentry**：错误追踪
- **Datadog**：性能监控
- **Slack/Discord**：告警通知

```typescript
// 在 Worker 中添加告警
worker.on('failed', async (job, error) => {
  // 发送 Slack 通知
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    body: JSON.stringify({
      text: `❌ Job failed: ${job.name}\nError: ${error.message}`
    })
  })
})
```

---

### 5.2 日志管理

使用结构化日志：

```typescript
import pino from 'pino'

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty'
  }
})

logger.info({ jobId, projectId }, 'Job started')
```

---

### 5.3 自动扩容

根据队列积压情况动态调整 Worker 数量：

- Railway：使用 Autoscaling
- Kubernetes：使用 HPA
- PM2：`pm2 scale vidfab-worker 5`

---

## 六、成本估算

### 开发环境
- **本地 Redis**：免费
- **Worker**：本地运行，免费

### 生产环境（中小规模）

| 服务 | 提供商 | 费用 |
|------|--------|------|
| Redis | Upstash | 免费额度：10K 命令/天 |
| Worker | Railway | 免费额度：$5/月 |
| 总计 | | **$0-5/月** |

### 生产环境（大规模）

| 服务 | 提供商 | 费用 |
|------|--------|------|
| Redis | Upstash Pro | $10/月（100K 命令/天） |
| Worker (2x) | Railway | $10/月 |
| 监控 | Sentry | $26/月 |
| 总计 | | **$46/月** |

---

## 七、下一步

配置完成后，你可以：

1. ✅ 测试分镜图生成功能
2. ✅ 添加更多队列任务类型（视频处理、音频生成等）
3. ✅ 集成监控和告警
4. ✅ 优化并发和重试策略

---

**需要帮助？**

- 📖 [BullMQ 文档](https://docs.bullmq.io/)
- 📖 [Upstash 文档](https://docs.upstash.com/redis)
- 📖 [Railway 文档](https://docs.railway.app/)

**遇到问题？**

请查看日志并检查：
1. Redis 连接是否正常
2. 环境变量是否正确
3. Worker 是否在运行
4. API Key 是否有效
