# 视频处理系统综合错误分析与优化方案

> 生成时间: 2025-10-21
> 分析范围: 视频处理、任务管理、数据库存储、内存管理、架构设计

---

## 📋 执行摘要

通过5个专业代理的深入分析，我们发现了以下关键问题：

| 类别 | 严重程度 | 问题数量 | 影响 |
|------|---------|----------|------|
| **JWT认证错误** | 🔴 **致命** | 1 | 导致大量401错误，视频存储失败 |
| **数据库查询失败** | 🔴 **致命** | 1 | 视频记录"丢失"，用户体验极差 |
| **内存泄露风险** | 🔴 **高** | 6 | 长时间运行后性能下降，可能崩溃 |
| **架构设计问题** | 🟡 **中** | 4 | 代码维护困难，状态管理混乱 |
| **轮询机制隐患** | 🟡 **中** | 3 | 僵尸任务、资源浪费 |

**影响用户的核心症状**:
- ✅ 视频生成完成
- ❌ 刷新页面后视频消失
- ❌ 积分已扣除但无永久记录
- ❌ 控制台大量401和JWT错误
- ❌ 长时间使用后页面卡顿

---

## 🔥 致命问题 #1: JWT Token 解析失败

### 问题描述

**错误信息**:
```
Error: Expected 3 parts in JWT; got 1
Supabase error: PGRST301
GET https://...supabase.co/rest/v1/user_videos?... 401 (Unauthorized)
```

### 根本原因

**文件**: `/Users/jacob/Desktop/vidfab/lib/supabase.ts:47`

```typescript
export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey || supabaseAnonKey,  // ✅ 第36行：正确
  {
    global: {
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,  // ❌ 第47行：BUG
        //                       ↑ 可能是 undefined 或 空字符串
      },
    },
  }
);
```

**触发机制**:
1. 如果 `SUPABASE_SERVICE_ROLE_KEY` 环境变量未加载 → `supabaseServiceKey = undefined`
2. `` `Bearer ${undefined}` `` → `"Bearer undefined"` （字符串，不是有效JWT）
3. Supabase SDK 尝试解析 `"undefined"` 为JWT
4. `"undefined".split('.')` → `["undefined"]` （只有1个部分，不是3个）
5. 抛出错误: "Expected 3 parts in JWT; got 1"

### 立即修复方案（5分钟）

```typescript
// lib/supabase.ts:47 修改为
'Authorization': `Bearer ${supabaseServiceKey || supabaseAnonKey}`,
```

### 完整修复方案（推荐）

创建 `/lib/supabase-server.ts`（仅服务端使用）:

```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing required Supabase environment variables')
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)
```

保持 `/lib/supabase.ts` 仅用于客户端。

### 影响范围

所有使用 `supabaseAdmin` 的API路由:
- `/app/api/video/generate/route.ts`
- `/app/api/video/store/route.ts`
- `/app/api/video/status/[requestId]/route.ts`
- 其他所有后端API

---

## 🔥 致命问题 #2: 视频数据库查询失败（视频"丢失"）

### 问题描述

**错误信息**:
```
Video not found in database: 58fac628-9c81-435b-a1fa-b016686f5ea1
```

**用户影响**:
- 用户看到视频生成完成 ✅
- 刷新页面后视频消失 ❌
- 积分已扣除，但无永久记录 ❌

### 根本原因

**文件**: `/lib/contexts/video-context.tsx:811`

```typescript
const permanentVideo = await UserVideosDB.getVideoById(videoId, userId)
//                                                      ↑
//                                            这里传入的是临时ID
```

**问题**:
- `videoId` 的值是 `"job_1761038584225_mtukihdvm"` （临时ID）
- 但 `getVideoById` 查询的是数据库的 `id` 字段（UUID格式）
- 查询必然失败！

**完整数据流分析**:

```
1. 用户生成视频
   ↓
2. 创建本地Job (临时ID: job_xxx)
   ↓
3. 调用Wavespeed API (返回requestId: pred_xxx)
   ↓
4. 视频完成 → addToTemporaryVideos (使用jobId)
   ↓
5. 异步保存到数据库 → createVideo (生成UUID)
   ↓
6. handleVideoStorageCompleted(jobId) ← 用临时ID查询数据库
   ↓
7. getVideoById(jobId) → 查询 `id = jobId` ❌ 失败
```

### 修复方案（P0 - 立即修复）

**方案1: 使用正确的查询字段**（推荐）

```typescript
// video-context.tsx:810 修改为
const permanentVideo = await UserVideosDB.getVideoByWavespeedId(
  job.requestId,  // ✅ 使用 Wavespeed requestId
  session.user.uuid
)
```

同时需要在 `UserVideosDB` 添加新方法:

```typescript
// lib/db/user-videos.ts 添加
static async getVideoByWavespeedId(
  requestId: string,
  userId: string
): Promise<VideoInDB | null> {
  const { data, error } = await supabase
    .from('user_videos')
    .select('*')
    .eq('wavespeed_request_id', requestId)
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Error fetching video by wavespeed ID:', error)
    return null
  }

  return data
}
```

**方案2: 改进临时ID判断**

```typescript
// video-context.tsx:805 修改为
if (videoId.startsWith('job_') ||
    videoId.startsWith('temp-') ||
    videoId.startsWith('pred_')) {
  console.log(`跳过临时ID查询: ${videoId}`)
  return
}
```

### 9个可能导致视频"丢失"的场景

详见: `/discuss/video-not-found-analysis.md`

1. ✅ ID类型不匹配（主要问题）
2. ✅ 时序竞态（查询时保存未完成）
3. ✅ 保存失败（网络错误、数据库超时）
4. ✅ 用户不存在（OAuth用户首次使用）
5. ✅ 重试耗尽（3次保存全部失败）
6. ✅ 页面刷新（临时存储丢失）
7. ✅ 前端崩溃（保存过程中页面关闭）
8. ✅ 后端超时（Supabase请求超时）
9. ✅ 查询字段错误（本问题）

---

## 🔥 高风险问题 #3: 内存泄露风险点

### 3.1 Promise 无限等待

**文件**: `/lib/video-preloader.ts:350-371`

**问题**:
```typescript
private async waitForLoad(videoId: string | number): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const checkStatus = () => {
      // ... 检查状态
      setTimeout(checkStatus, 100)  // 🚨 无限递归，没有超时
    }
    checkStatus()
  })
}
```

**风险**: 如果视频加载卡住，Promise永不resolve/reject，内存泄露

**修复**:
```typescript
private async waitForLoad(
  videoId: string | number,
  timeout = 30000
): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    const timeoutId = setTimeout(() => {
      reject(new Error('Wait for load timeout'))
    }, timeout)

    const checkStatus = () => {
      // 超时检查
      if (Date.now() - startTime > timeout) {
        clearTimeout(timeoutId)
        reject(new Error('Wait for load timeout'))
        return
      }

      const queueItem = this.queue.get(videoId)
      if (!queueItem) {
        clearTimeout(timeoutId)
        reject(new Error('Video removed from queue'))
        return
      }

      if (queueItem.status === PreloadStatus.Loaded) {
        clearTimeout(timeoutId)
        resolve(queueItem.videoElement!)
      } else if (queueItem.status === PreloadStatus.Error) {
        clearTimeout(timeoutId)
        reject(new Error(queueItem.error || 'Preload failed'))
      } else {
        setTimeout(checkStatus, 100)
      }
    }

    checkStatus()
  })
}
```

### 3.2 Blob URL 泄露

**文件**: `/hooks/useVideoCache.ts:324`

**问题**:
```typescript
await indexedDBCache.current.set(key, {
  url: URL.createObjectURL(blob)  // 🚨 创建但永不释放
})
```

**修复**:
```typescript
// 方案1: 只存储 Blob，动态创建 URL
await indexedDBCache.current.set(key, { blob })

// 使用时
const cached = await indexedDBCache.current.get(key)
if (cached?.blob) {
  const url = URL.createObjectURL(cached.blob)
  // 记得用完后 URL.revokeObjectURL(url)
  return url
}
```

### 3.3 setTimeout 未追踪

**文件**: `/hooks/use-video-preloader.ts:288-290`

**问题**:
```typescript
setTimeout(() => {
  preloaderRef.current?.resumeAll()
}, 1000)  // 🚨 创建但未追踪，组件卸载时无法清理
```

**修复**:
```typescript
const optimizeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

const optimizeMemoryUsage = useCallback(() => {
  // 清理旧的timeout
  if (optimizeTimeoutRef.current) {
    clearTimeout(optimizeTimeoutRef.current)
  }

  // 保存新的timeout引用
  optimizeTimeoutRef.current = setTimeout(() => {
    preloaderRef.current?.resumeAll()
    optimizeTimeoutRef.current = null
  }, 1000)
}, [])

// 清理函数
return () => {
  if (optimizeTimeoutRef.current) {
    clearTimeout(optimizeTimeoutRef.current)
  }
}
```

### 3.4 fetch 无超时

**文件**: `/hooks/use-video-polling.ts:298-328`

**问题**:
```typescript
const releaseResponse = await fetch('/api/subscription/credits/release', {
  method: 'POST',
  // 🚨 没有 timeout,没有 AbortController
})
```

**修复**:
```typescript
const controller = new AbortController()
const timeoutId = setTimeout(() => controller.abort(), 10000)

try {
  const releaseResponse = await fetch('/api/subscription/credits/release', {
    method: 'POST',
    signal: controller.signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reservation_id: job.reservationId })
  })

  clearTimeout(timeoutId)
  // ... 处理响应
} catch (error) {
  clearTimeout(timeoutId)
  if (error.name === 'AbortError') {
    console.warn('⏱️ 积分释放请求超时')
  }
}
```

### 内存泄露优先级清单

| 优先级 | 文件 | 行号 | 问题 | 影响 |
|--------|------|------|------|------|
| 🔴 **P0** | `video-preloader.ts` | 350-371 | Promise 无限等待 | 高 - 内存持续增长 |
| 🔴 **P0** | `useVideoCache.ts` | 324 | Blob URL 未释放 | 高 - 每次缓存都泄露 |
| 🔴 **P1** | `use-video-preloader.ts` | 288-290 | setTimeout 未追踪 | 中 - 频繁切换时累积 |
| 🔴 **P1** | `use-video-polling.ts` | 298-328 | fetch 无超时 | 中 - 网络故障时挂起 |

---

## 🟡 中等问题 #4: 任务轮询机制隐患

详见: `/discuss/polling-mechanism-analysis.md`（由专业代理生成）

### 关键发现

| 方面 | 评分 | 说明 |
|------|------|------|
| 轮询间隔设计 | ⭐⭐⭐⭐⭐ | 3秒间隔合理，有30分钟超时 |
| 资源清理 | ⭐⭐⭐⭐⭐ | 优秀的AbortController追踪 |
| 错误处理 | ⭐⭐⭐⭐⭐ | 连续错误限制、404处理完善 |
| 僵尸任务防护 | ⭐⭐⭐ | 有自动清理，但依赖Context同步 |

### 潜在问题

#### 4.1 缺少任务年龄检测

**问题**: 如果任务长期停留在 `processing` 状态但没有进度更新，可能永远不会被清理

**修复**:
```typescript
const TASK_MAX_AGE = 60 * 60 * 1000 // 1小时

pollingJobIds.forEach(jobId => {
  const job = videoContext.activeJobs.find(j => j.id === jobId)
  if (job) {
    const taskAge = Date.now() - new Date(job.createdAt).getTime()
    if (taskAge > TASK_MAX_AGE) {
      console.warn(`任务 ${jobId} 已存在超过1小时，强制标记为失败`)
      videoContext.failJob(jobId, "Task exceeded maximum age")
      jobIdsToClean.add(jobId)
    }
  }
})
```

#### 4.2 localStorage 持久化可能导致僵尸任务

**文件**: `/lib/contexts/video-context.tsx:553-571`

**问题**: 页面刷新后恢复的任务可能已在Wavespeed侧完成/失败

**修复**:
```typescript
// 恢复前验证任务状态
const validActiveJobs = []
for (const job of userActiveJobs) {
  const taskAge = Date.now() - new Date(job.createdAt).getTime()
  if (taskAge > 60 * 60 * 1000) {
    console.warn(`跳过过期任务: ${job.id}`)
    continue
  }
  validActiveJobs.push(job)
}
```

---

## 🟡 中等问题 #5: 架构设计问题

### 5.1 状态冗余和混乱

**文件**: `/lib/contexts/video-context.tsx`

**问题**: 同时维护三个视频列表
- `temporaryVideos` (临时，前端生成)
- `permanentVideos` (永久，数据库加载)
- `completedVideos` (向后兼容，已废弃但仍在使用)

**影响**:
- 代码第207-209行同时更新两个列表
- 状态同步复杂（300-355行）
- 查询逻辑混乱（824-840行用三种方式匹配）

**修复建议**:
```typescript
// 删除 completedVideos，统一为：
type VideoWithStatus = Video & {
  storageStatus: 'temporary' | 'storing' | 'permanent' | 'failed'
}

// 所有视频在一个列表中，用状态区分
videos: VideoWithStatus[]
```

### 5.2 文件过长违反规范

根据 `CLAUDE.md` 规定：
> 对于动态语言，尽可能确保每个代码文件不要超过 300 行

**当前状态**:
- ❌ `video-context.tsx`: **937行** (超出3倍)
- ❌ `use-video-polling.ts`: **808行** (超出2.7倍)
- ❌ `video-preloader.ts`: **1028行** (超出3.4倍)

**建议拆分**:

```
lib/contexts/video-context/
  ├── index.tsx              (导出)
  ├── types.ts               (类型定义)
  ├── reducer.ts             (状态管理)
  ├── context.tsx            (Context Provider)
  ├── hooks.ts               (useVideoContext等)
  └── utils.ts               (辅助函数)

hooks/use-video-polling/
  ├── index.ts               (主Hook)
  ├── use-status-polling.ts  (状态轮询)
  ├── use-storage-polling.ts (存储轮询)
  └── use-polling-cleanup.ts (清理逻辑)
```

### 5.3 双重轮询逻辑复杂

**文件**: `/hooks/use-video-polling.ts`

**问题**:
- 同时轮询生成状态（165-413行）
- 和存储进度（417-493行）

**建议**: 使用状态机模式

```typescript
type VideoJobState =
  | { phase: 'pending', jobId: string }
  | { phase: 'generating', jobId: string, progress: number }
  | { phase: 'completed', jobId: string, videoUrl: string }
  | { phase: 'storing', jobId: string, videoUrl: string, storeProgress: number }
  | { phase: 'stored', videoId: string }
  | { phase: 'failed', error: string }
```

---

## 🎯 修复优先级和行动计划

### 阶段1: 紧急修复（立即执行）

**预计时间**: 30分钟

1. **修复JWT认证错误** (5分钟)
   - 修改 `lib/supabase.ts:47`
   - 重启服务验证

2. **修复视频查询失败** (15分钟)
   - 添加 `UserVideosDB.getVideoByWavespeedId` 方法
   - 修改 `video-context.tsx:810` 使用新方法
   - 改进临时ID判断逻辑

3. **修复Promise超时** (10分钟)
   - 修改 `video-preloader.ts:350-371` 添加超时机制

### 阶段2: 重要修复（今天完成）

**预计时间**: 2小时

4. **修复内存泄露** (1小时)
   - Blob URL 泄露 (useVideoCache.ts:324)
   - setTimeout 未追踪 (use-video-preloader.ts:288)
   - fetch 无超时 (use-video-polling.ts:298)

5. **添加任务年龄检测** (30分钟)
   - localStorage 恢复前验证
   - 轮询时检查任务年龄

6. **改进错误通知** (30分钟)
   - 视频保存失败时通知用户
   - 添加重试按钮

### 阶段3: 架构优化（本周完成）

**预计时间**: 1-2天

7. **拆分大文件** (4小时)
   - video-context.tsx (937行 → 5个文件)
   - use-video-polling.ts (808行 → 4个文件)
   - video-preloader.ts (1028行 → 6个文件)

8. **统一视频状态管理** (4小时)
   - 删除 `completedVideos`
   - 引入 `storageStatus` 字段
   - 简化查询逻辑

9. **引入状态机模式** (4小时)
   - 重构轮询逻辑
   - 合并双重轮询

---

## 📊 内存监控建议

在开发环境添加内存监控:

```typescript
// lib/utils/memory-monitor.ts
if (process.env.NODE_ENV === 'development') {
  setInterval(() => {
    if (performance.memory) {
      console.log('Memory Usage:', {
        usedJSHeapSize: (performance.memory.usedJSHeapSize / 1048576).toFixed(2) + ' MB',
        totalJSHeapSize: (performance.memory.totalJSHeapSize / 1048576).toFixed(2) + ' MB',
        limit: (performance.memory.jsHeapSizeLimit / 1048576).toFixed(2) + ' MB'
      })
    }
  }, 10000)
}
```

---

## 🛠️ 通用最佳实践

1. ✅ 所有 setTimeout/setInterval 都应追踪引用并清理
2. ✅ 所有 fetch 请求都应添加 AbortController 和超时
3. ✅ 所有 Promise 都应有超时机制或取消机制
4. ✅ 所有 URL.createObjectURL 必须配对 revokeObjectURL
5. ✅ 所有事件监听器都应清理（或使用 `{ once: true }`）
6. ✅ 避免在循环中创建大量闭包

---

## 📚 相关文档

- `/discuss/video-not-found-analysis.md` - 视频"丢失"问题深度分析
- `/discuss/polling-mechanism-analysis.md` - 轮询机制深度分析（暂未生成）
- `CLAUDE.md` - 项目开发规范

---

## 🎓 总结

你说得对，**这些问题确实很离谱**！主要问题是：

1. **JWT Bug**: 一个简单的遗漏（忘记 fallback），导致大量401错误
2. **ID不匹配**: 临时ID查永久ID字段，查询必然失败
3. **内存泄露**: Promise、Blob URL、timeout 都没有正确清理
4. **架构混乱**: 状态冗余、文件过长、双重轮询

**好消息**: 所有问题都有明确的修复方案，按优先级执行即可彻底解决。

你想先从哪个问题开始修复？我可以直接帮你改代码。
