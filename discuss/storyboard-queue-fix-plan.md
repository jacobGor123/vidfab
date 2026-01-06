# 分镜图生成队列系统修复方案

**问题**: 分镜图生成使用后台 Promise 容易被 Vercel Lambda 打断，导致轮询卡住
**解决方案**: 集成现有的 BullMQ 队列系统，参考 iMideo 的混合队列架构

---

## 一、问题根因分析

### 1.1 当前实现的致命缺陷

**位置**: `app/api/video-agent/projects/[id]/storyboards/generate/route.ts:362-394`

```typescript
// 🔥 "火即忘"模式 - 高风险！
Promise.resolve().then(async () => {
  await generateStoryboardsAsync(projectId, shots, characters, style, aspectRatio)
})

return NextResponse.json({ success: true })
```

**风险**:
- Vercel 不保证后台 Promise 会执行完成
- API 响应返回后（~100ms），Lambda 可能立即关闭
- 分镜生成任务被中断
- 数据库记录停留在 `generating` 状态
- 前端轮询永远得到 `generating`，卡住 ⚰️

### 1.2 为什么 Inngest 方案被 Revert？

**Commit 记录**:
```
commit 510db5b4 - fix(video-agent): move storyboard generation to Inngest
              ↓ (4小时后被 Revert)
commit f5d476fb - Revert "fix(video-agent): move storyboard generation to Inngest..."
```

**可能原因**:
- Inngest 配置问题
- 额外的依赖和复杂度
- 调试困难
- 需要额外的基础设施

### 1.3 其他相关问题

1. **API 超时太保守**（50秒）
   - `lib/services/byteplus/image/seedream-api.ts:16`
   - Vercel Pro 最大 60 秒，留给网络的时间太少

2. **轮询没有超时保护**
   - `app/studio/video-agent-beta/components/steps/useStoryboardGeneration.ts:132`
   - 没有使用 `IMAGE_POLLING_CONFIG.maxDuration`

3. **无自动重试机制**
   - 失败的分镜不会自动重试

---

## 二、现有队列基础设施分析

### 2.1 vidfab 已有的队列系统

| 组件 | 文件 | 状态 | 说明 |
|------|------|------|------|
| BullMQ 队列管理器 | `lib/queue/queue-manager.ts` | ✅ 已实现 | 700+ 行，完整的队列系统 |
| IORedis 配置 | `lib/redis.ts` | ⚠️ 需要 Redis 服务器 | 传统 Redis，不适合 Serverless |
| Upstash Redis | `lib/redis-upstash.ts` | ✅ 已配置 | Serverless Redis，**更适合 Vercel** |
| 队列类型定义 | `lib/queue/types.ts` | ✅ 已完成 | 完整的类型系统 |
| Inngest 适配器 | `lib/queue/inngest-adapter.ts` | ❓ 未知 | 需要检查状态 |

**关键发现**:
- ✅ BullMQ 已经实现，功能完善（支持重试、进度跟踪、优先级等）
- ❌ 但使用的是 IORedis（需要自己部署 Redis 服务器）
- ✅ Upstash Redis 已配置（Serverless，云托管，**适合 Vercel**）
- ❌ 分镜图生成**没有使用队列**

### 2.2 iMideo 项目的队列架构

**核心技术栈**:
1. **Upstash Redis** - 主队列（Serverless，分布式）
2. **Supabase PostgreSQL** - 备用队列（故障转移）
3. **Upstash QStash** - 长时间任务（突破 Vercel 5分钟超时）

**关键特性**:
- 混合队列（Redis + Database）
- 自动故障转移
- Worker 并发处理（2 个并发，3 秒轮询）
- 自动重试（最多 3 次，指数退避）
- 卡住任务恢复（每 5 分钟检查一次）

---

## 三、解决方案：三种选择

### 方案 A：使用现有 BullMQ + Upstash Redis（推荐 ⭐）

**优势**:
- ✅ 最小改动（BullMQ 已实现）
- ✅ 功能强大（BullMQ 是工业级队列）
- ✅ Serverless 友好（Upstash Redis）
- ✅ 零额外依赖

**步骤**:
1. 修改 `lib/queue/queue-manager.ts` 使用 Upstash Redis
2. 添加 `storyboard_generation` 任务类型
3. 创建 Storyboard 处理器
4. 修改 API Route 使用队列

**实施时间**: 2-3 小时

---

### 方案 B：参考 iMideo 的混合队列架构

**优势**:
- ✅ 更高的可靠性（双重备份）
- ✅ 自动故障转移
- ✅ 适合长时间任务
- ✅ 完全 Serverless

**劣势**:
- ❌ 需要更多代码（~500 行）
- ❌ 增加复杂度

**步骤**:
1. 创建 `lib/redis-task-queue.ts`（仿照 iMideo）
2. 创建 `lib/database-queue.ts`（备用队列）
3. 创建 `lib/queue-adapter.ts`（混合适配器）
4. 实施自动故障转移逻辑

**实施时间**: 1-2 天

---

### 方案 C：修复 Inngest 集成（不推荐）

**优势**:
- ✅ 专业的队列服务
- ✅ 可视化管理界面
- ✅ 自动重试和监控

**劣势**:
- ❌ 额外的依赖
- ❌ 之前被 Revert 了（有坑）
- ❌ 调试困难
- ❌ 需要额外配置

**实施时间**: 1 天（调查 + 修复 bug）

---

## 四、推荐方案详细设计（方案 A）

### 4.1 架构设计

```
用户点击 "Generate Storyboards"
    ↓
POST /api/video-agent/projects/[id]/storyboards/generate
    ├─ 幂等性检查（已有 generating/success？）
    ├─ 创建初始分镜记录（status='generating'）
    ├─ 添加任务到 BullMQ 队列 ✅
    ├─ 立即返回 200 ✅
    └─ 返回任务 ID 给前端

BullMQ Worker（独立进程或 API Route）
    ├─ 从 Upstash Redis 获取任务（3 秒轮询）
    ├─ 并发生成分镜（p-limit，并发数=3）
    ├─ 每张完成 → 立即更新数据库
    ├─ 自动重试（失败后重新入队，最多 3 次）
    └─ 全部完成 → 更新项目状态

前端轮询（每 2 秒）
    ↓
GET /api/video-agent/projects/[id]/storyboards/status
    ├─ 查询所有分镜状态
    ├─ 返回最新状态 + 进度
    └─ 检测是否全部完成

如果任务卡住：
    → Worker 自动检测（stalledInterval=30s）
    → 标记为 stalled，重新入队
    → 最多重试 3 次
    → 超过限制 → 标记为 failed
```

### 4.2 代码改动清单

#### 4.2.1 修改 `lib/queue/queue-manager.ts`

**改动 1**: 支持 Upstash Redis

```typescript
// 原代码（第 41-44 行）
import { redis } from '../redis'

this.queue = new Queue(QUEUE_CONFIG.name, {
  connection: redis,
  defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
})

// 新代码：支持 Upstash Redis（通过 ioredis 兼容层）
import { redis as upstashRedis } from '../redis-upstash'
import IORedis from 'ioredis'

// BullMQ 需要 ioredis 实例，创建适配器
const createIORedisAdapter = (upstashClient: any): IORedis => {
  // Upstash REST API 转 ioredis 协议
  // 或者使用 @upstash/redis 的 ioredis 兼容模式
  // 参考：https://github.com/upstash/upstash-redis#compatibility
}

const redis = createIORedisAdapter(upstashRedis)

this.queue = new Queue(QUEUE_CONFIG.name, {
  connection: redis,
  defaultJobOptions: QUEUE_CONFIG.defaultJobOptions,
})
```

**改动 2**: 添加分镜图任务类型

```typescript
// lib/queue/types.ts 增加新类型
export type JobType =
  | 'download_video'
  | 'generate_thumbnail'
  | 'cleanup_temp'
  | 'update_quota'
  | 'storyboard_generation'  // 🔥 新增

export interface StoryboardGenerationJobData extends BaseJobData {
  type: 'storyboard_generation'
  projectId: string
  shots: Array<{
    shot_number: number
    description: string
    duration_seconds: number
    characters: string[]
  }>
  characters: Array<{
    name: string
    description: string
    reference_image_url?: string
  }>
  style: string
  aspectRatio: '16:9' | '9:16'
}
```

**改动 3**: 添加分镜图处理器

```typescript
// lib/queue/queue-manager.ts 增加处理逻辑（第 242-261 行）

private async processJob(job: Job): Promise<JobResult> {
  // ... 现有代码 ...

  switch (job.name as JobType) {
    // ... 现有 case ...

    case 'storyboard_generation':
      result = await this.processStoryboardGeneration(job)
      break
  }
}

private async processStoryboardGeneration(job: Job): Promise<any> {
  const { generateStoryboardsAsync } = await import('../services/video-agent/storyboard-generator')
  const jobData = job.data as StoryboardGenerationJobData

  try {
    // 更新项目状态
    await job.updateProgress({ percent: 0, message: '开始生成分镜...' })

    // 调用核心生成逻辑（复用现有代码）
    const result = await generateStoryboardsAsync(
      jobData.projectId,
      jobData.shots,
      jobData.characters,
      jobData.style,
      jobData.aspectRatio,
      // 🔥 传入进度回调
      (progress) => {
        job.updateProgress({
          percent: progress.percent,
          message: progress.message
        }).catch(console.error)
      }
    )

    await job.updateProgress({ percent: 100, message: '分镜生成完成' })

    return result
  } catch (error) {
    console.error(`❌ Storyboard generation failed for project ${jobData.projectId}:`, error)
    throw error
  }
}
```

#### 4.2.2 修改 API Route

**文件**: `app/api/video-agent/projects/[id]/storyboards/generate/route.ts`

```typescript
// 原代码（第 362-394 行）
Promise.resolve().then(async () => {
  await generateStoryboardsAsync(projectId, shots, characters, style, aspectRatio)
})

return NextResponse.json({ success: true })

// 新代码：使用队列
import { videoQueueManager } from '@/lib/queue/queue-manager'

// 添加任务到队列
const jobId = await videoQueueManager.addJob(
  'storyboard_generation',
  {
    jobId: `storyboard_${projectId}`,
    userId: userId,
    videoId: projectId,
    projectId,
    shots,
    characters,
    style,
    aspectRatio,
    createdAt: new Date().toISOString()
  },
  {
    priority: 'high',      // 高优先级
    attempts: 3,           // 最多重试 3 次
    backoff: {
      type: 'exponential',
      delay: 5000          // 5 秒起始延迟
    }
  }
)

return NextResponse.json({
  success: true,
  data: {
    message: 'Storyboard generation queued',
    jobId,
    total: shots.length
  }
})
```

#### 4.2.3 增加进度跟踪

**修改**: `lib/services/video-agent/storyboard-generator.ts`（新建文件）

```typescript
/**
 * 分镜图生成核心逻辑（从 route.ts 提取）
 */
import pLimit from 'p-limit'
import { generateSingleStoryboard } from './processors/storyboard/storyboard-core'
import { supabaseAdmin } from '@/lib/supabase'

type ProgressCallback = (progress: {
  percent: number
  message: string
  completed: number
  total: number
}) => void

export async function generateStoryboardsAsync(
  projectId: string,
  shots: any[],
  characters: any[],
  style: string,
  aspectRatio: '16:9' | '9:16',
  onProgress?: ProgressCallback  // 🔥 新增进度回调
) {
  const CONCURRENCY = parseInt(process.env.STORYBOARD_CONCURRENCY || '3', 10)
  const limit = pLimit(CONCURRENCY)

  let completedCount = 0
  let failedCount = 0

  const tasks = shots.map((shot) =>
    limit(async () => {
      try {
        // 调用核心生成服务
        const result = await generateSingleStoryboard(shot, characters, style, aspectRatio)

        // 立即更新数据库
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            image_url: result.image_url,
            status: result.status,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        completedCount++

        // 🔥 报告进度
        onProgress?.({
          percent: Math.round((completedCount / shots.length) * 100),
          message: `已完成 ${completedCount}/${shots.length} 张分镜`,
          completed: completedCount,
          total: shots.length
        })

      } catch (error) {
        failedCount++
        console.error(`Failed to generate storyboard for shot ${shot.shot_number}:`, error)

        // 失败时更新状态
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Generation failed',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
      }
    })
  )

  // 等待所有任务完成
  await Promise.allSettled(tasks)

  // 更新项目最终状态
  const finalStatus = failedCount === 0 ? 'completed' :
                     failedCount === shots.length ? 'failed' : 'partial'

  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      step_3_status: finalStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)

  return {
    success: true,
    completed: completedCount,
    failed: failedCount,
    total: shots.length
  }
}
```

#### 4.2.4 启动 Worker

**新建文件**: `scripts/start-queue-worker.sh`

```bash
#!/bin/bash
# 启动 BullMQ Worker

set -e

echo "🚀 Starting BullMQ Worker for VidFab Video Processing..."

# 加载环境变量
if [ -f .env.local ]; then
  export $(cat .env.local | grep -v '^#' | xargs)
fi

# 启动 Worker
tsx worker/queue-worker.ts
```

**新建文件**: `worker/queue-worker.ts`

```typescript
/**
 * BullMQ Worker 主程序
 */
import { videoQueueManager } from '@/lib/queue/queue-manager'

async function main() {
  console.log('🚀 Starting BullMQ Worker...')

  // 启动 Worker
  await videoQueueManager.startWorker({
    onActive: (job) => {
      console.log(`🔥 Processing job: ${job.type} (${job.jobId})`)
    },
    onProgress: (job, progress) => {
      console.log(`⏳ Progress: ${progress.percent}% - ${progress.message}`)
    },
    onCompleted: (job, result) => {
      console.log(`✅ Completed: ${job.type} (${job.jobId})`, result)
    },
    onFailed: (job, error) => {
      console.error(`❌ Failed: ${job.type} (${job.jobId})`, error)
    },
    onStalled: (job) => {
      console.warn(`⚠️  Stalled: ${job.type} (${job.jobId})`)
    }
  })

  console.log('✅ Worker started successfully')

  // 优雅关闭
  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down worker...')
    await videoQueueManager.stopWorker()
    process.exit(0)
  })
}

main().catch((error) => {
  console.error('❌ Worker startup failed:', error)
  process.exit(1)
})
```

### 4.3 环境变量配置

**新增 `.env.local`**:

```bash
# Upstash Redis（用于 BullMQ 队列）
UPSTASH_REDIS_REST_URL="https://your-redis-instance.upstash.io"
UPSTASH_REDIS_REST_TOKEN="your-token-here"

# 队列配置
QUEUE_PREFIX="vidfab-video-processing"
QUEUE_CONCURRENCY=3                # Worker 并发数
QUEUE_MAX_RETRIES=3                # 最大重试次数
QUEUE_RETRY_DELAY=5000             # 重试延迟（毫秒）

# 分镜图生成配置
STORYBOARD_CONCURRENCY=3           # 分镜并发生成数
```

### 4.4 部署方案

#### 方案 1: Railway 托管 Worker（推荐）

**优势**:
- ✅ 零停机（Worker 24/7 运行）
- ✅ 自动重启
- ✅ 免费额度（$5/月）

**步骤**:
1. 在 Railway 创建新项目
2. 连接 GitHub 仓库
3. 设置启动命令：`npm run worker`
4. 配置环境变量（从 Vercel 复制）

#### 方案 2: Vercel Cron + Worker API

**优势**:
- ✅ 零额外成本
- ✅ 简单部署

**劣势**:
- ❌ Worker 只能运行 60 秒

**步骤**:
1. 创建 `/api/worker/process-queue` API Route
2. 配置 Vercel Cron（每分钟触发一次）
3. Worker API 处理积压的任务

#### 方案 3: 本地开发 Worker

**用于开发环境**:

```bash
# 启动 Worker
npm run worker

# 或者使用 scripts
./scripts/start-queue-worker.sh
```

---

## 五、测试计划

### 5.1 单元测试

```typescript
// tests/queue/storyboard-generation.test.ts
import { videoQueueManager } from '@/lib/queue/queue-manager'

describe('Storyboard Generation Queue', () => {
  it('should add job to queue', async () => {
    const jobId = await videoQueueManager.addJob('storyboard_generation', {
      // test data
    })

    expect(jobId).toBeDefined()
  })

  it('should process job successfully', async () => {
    // test implementation
  })

  it('should retry on failure', async () => {
    // test retry logic
  })
})
```

### 5.2 集成测试

1. **正常流程测试**
   - 用户创建项目
   - 生成分镜图
   - 验证所有分镜成功生成

2. **失败重试测试**
   - 模拟 API 失败
   - 验证自动重试（最多 3 次）
   - 验证最终失败状态

3. **并发测试**
   - 同时提交 10 个项目
   - 验证队列按序处理
   - 验证并发限制（3 个）

4. **卡住恢复测试**
   - 模拟 Worker 崩溃
   - 重启 Worker
   - 验证任务自动恢复

---

## 六、监控和告警

### 6.1 队列监控指标

```typescript
// 定期报告队列状态
setInterval(async () => {
  const stats = await videoQueueManager.getQueueStats()

  console.log('📊 Queue Stats:', {
    waiting: stats.waiting,
    active: stats.active,
    completed: stats.completed,
    failed: stats.failed,
    delayed: stats.delayed
  })

  // 🔥 告警：如果有超过 10 个任务在等待
  if (stats.waiting > 10) {
    console.warn('⚠️  High queue backlog detected!')
    // 发送告警（邮件、Slack 等）
  }
}, 60000) // 每分钟检查一次
```

### 6.2 日志记录

```typescript
// lib/queue/logger.ts
export class QueueLogger {
  static logJobStart(job: any) {
    console.log(`[Queue] 🔥 Job started: ${job.name} (${job.id})`, {
      timestamp: new Date().toISOString(),
      data: job.data
    })
  }

  static logJobComplete(job: any, result: any) {
    console.log(`[Queue] ✅ Job completed: ${job.name} (${job.id})`, {
      timestamp: new Date().toISOString(),
      duration: result.duration,
      retries: result.retryCount
    })
  }

  static logJobFailed(job: any, error: any) {
    console.error(`[Queue] ❌ Job failed: ${job.name} (${job.id})`, {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack
    })
  }
}
```

---

## 七、实施时间表

| 任务 | 预计时间 | 负责人 | 状态 |
|------|----------|--------|------|
| 1. 修改 queue-manager.ts 支持 Upstash | 1 小时 | - | ⏳ 待开始 |
| 2. 添加分镜图任务类型和处理器 | 1 小时 | - | ⏳ 待开始 |
| 3. 修改 API Route 使用队列 | 30 分钟 | - | ⏳ 待开始 |
| 4. 提取分镜生成核心逻辑 | 30 分钟 | - | ⏳ 待开始 |
| 5. 创建 Worker 启动脚本 | 15 分钟 | - | ⏳ 待开始 |
| 6. 本地测试 | 1 小时 | - | ⏳ 待开始 |
| 7. Railway 部署 Worker | 30 分钟 | - | ⏳ 待开始 |
| 8. 生产测试 | 1 小时 | - | ⏳ 待开始 |
| **总计** | **5.5 小时** | | |

---

## 八、后续优化（可选）

### 8.1 增加超时检测

**位置**: `app/api/video-agent/projects/[id]/storyboards/status/route.ts`

```typescript
const STORYBOARD_TIMEOUT_MS = 5 * 60 * 1000  // 5 分钟

for (const sb of storyboards) {
  if (sb.status === 'generating') {
    const startTime = new Date(sb.created_at).getTime()
    const now = Date.now()

    if (now - startTime > STORYBOARD_TIMEOUT_MS) {
      await supabaseAdmin
        .from('project_storyboards')
        .update({
          status: 'failed',
          error_message: 'Generation timeout (exceeded 5 minutes)',
          updated_at: new Date().toISOString()
        })
        .eq('id', sb.id)
    }
  }
}
```

### 8.2 前端轮询超时保护

```typescript
// useStoryboardGeneration.ts
const pollStartTime = useRef<number>(Date.now())
const MAX_POLL_DURATION = 5 * 60 * 1000  // 5 分钟

const pollStatus = useCallback(async () => {
  const elapsed = Date.now() - pollStartTime.current
  if (elapsed > MAX_POLL_DURATION) {
    console.error('Polling timeout exceeded')
    setIsGenerating(false)
    setError('Generation timeout. Please refresh and try again.')
    return
  }

  // ... 原有逻辑
}, [])
```

### 8.3 添加任务优先级

```typescript
// 高优先级用户（VIP）
const priority = user.isPremium ? 'critical' : 'normal'

await videoQueueManager.addJob('storyboard_generation', data, {
  priority
})
```

---

## 九、风险评估

| 风险 | 严重程度 | 缓解措施 |
|------|----------|----------|
| Upstash Redis 连接失败 | 高 | 添加健康检查，降级到数据库队列 |
| Worker 崩溃导致任务丢失 | 中 | BullMQ 自动恢复，任务持久化到 Redis |
| 队列积压过多 | 中 | 监控告警，动态调整并发数 |
| 迁移过程中影响现有功能 | 低 | 分阶段上线，保留旧代码备份 |

---

## 十、总结

### 核心改动：
1. ✅ 使用现有的 BullMQ 队列系统
2. ✅ 迁移到 Upstash Redis（Serverless）
3. ✅ 添加分镜图生成任务类型
4. ✅ 实施自动重试和卡住恢复
5. ✅ Railway 托管 Worker（或 Vercel Cron）

### 预期效果：
- 🎯 **彻底解决卡住问题**（任务持久化到 Redis）
- 🎯 **自动重试**（最多 3 次，指数退避）
- 🎯 **进度实时跟踪**（前端可见）
- 🎯 **生产级可靠性**（BullMQ 工业级队列）
- 🎯 **零额外成本**（使用现有基础设施）

### 后续计划：
- 📋 实施本方案（预计 5.5 小时）
- 📋 监控生产环境运行情况（1 周）
- 📋 收集用户反馈
- 📋 根据需要实施后续优化

---

**文档版本**: v1.0
**创建时间**: 2026-01-06
**作者**: Claude Code
**审核状态**: ⏳ 待审核
