# 修复"僵尸轮询"问题 - 完整分析

## 问题描述

线上环境出现任务卡在半启动状态:
- ✅ UI 显示进度条,任务看起来正在进行
- ❌ 实际上没有轮询在运行
- ❌ 任务永远不会完成或失败
- ❌ 用户体验: 等待无果,需要刷新页面

![问题截图](用户提供的截图显示右侧有一个卡住的进度条)

---

## 🔍 根因分析

### 核心问题: 任务创建和轮询启动的时序漏洞

**正常流程:**

```typescript
// 1. 创建本地任务
const job = videoContext.addJob({
  requestId: '',        // ⚠️ 初始为空!
  status: 'generating', // 状态为 'generating'
  progress: 0
})

// 2. 调用 API
const response = await fetch('/api/video/generate', ...)
const data = await response.json()

// 3. 更新 requestId
videoContext.updateJob(job.id, {
  requestId: data.data.requestId, // ✅ 获得 requestId
  status: 'processing'            // 状态变为 'processing'
})

// 4. 启动轮询
startPolling(job.id)
```

### 🚨 异常场景分析

#### 场景 1: API 调用超时或网络中断

```
时间线:
t=0s    创建任务 { status: 'generating', requestId: '' }
        ↓ UI 显示进度条 (因为任务存在于 activeJobs)

t=1s    调用 /api/video/generate
        ↓ 网络请求发出

t=10s   ❌ 网络超时/中断
        ↓ 请求失败,但...

问题:
- 任务没有被清理 (removeJob 未执行或执行失败)
- 任务仍在 activeJobs 中,状态为 'generating'
- UI 继续显示进度条
- 但轮询永远不会启动 (因为没有 requestId)
```

**代码位置:** `use-video-generation.tsx` 第 110-183 行

```typescript
try {
  const job = videoContext.addJob({ requestId: '', status: 'generating' })

  const response = await fetch('/api/video/generate', ...)

  if (!response.ok) {
    videoContext.removeJob(job.id) // ✅ 正常情况下会清理
    throw new Error(...)
  }

  videoContext.updateJob(job.id, {
    requestId: data.data.requestId,
    status: 'processing'
  })

  onSuccess?.(job.id) // 触发轮询

} catch (error) {
  // ⚠️ 问题: 如果在 removeJob 之前就网络中断...
  // 任务可能没有被清理
}
```

#### 场景 2: requestId 为空时轮询检查逻辑

**轮询启动检查** (`use-video-polling.ts` 第 181-190 行):

```typescript
if (!job.requestId) {
  console.warn(`Job ${jobId} has no requestId, stopping polling`)
  stoppedJobIdsRef.current.add(jobId)
  setPollingJobIds(prev => {
    const newSet = new Set(prev)
    newSet.delete(jobId)
    return newSet
  })
  return // ❌ 停止轮询,但任务仍在 activeJobs 中!
}
```

**结果:**
- 轮询被停止 ✅
- 任务仍在 `videoContext.activeJobs` 中 ❌
- UI 继续显示进度条 ❌
- 用户看到"僵尸任务" ❌

#### 场景 3: 页面刷新后的状态不一致

```
用户操作:
1. 点击生成视频
2. 任务创建 { status: 'generating', requestId: '' }
3. 立即刷新页面 (API 还没返回)

刷新后:
- activeJobs 从 localStorage/SessionStorage 恢复(如果有持久化)
- 或者任务丢失,但 UI 可能有残留状态
- 轮询 Hook 检查到无 requestId,停止轮询
- 但 UI 可能仍显示任务卡片
```

#### 场景 4: 并发创建多个任务

```
用户快速点击 3 次生成按钮:

t=0s    创建任务1 { status: 'generating', requestId: '' }
t=0.5s  创建任务2 { status: 'generating', requestId: '' }
t=1s    创建任务3 { status: 'generating', requestId: '' }

t=2s    API1 返回成功 → 任务1 获得 requestId,开始轮询 ✅
t=3s    API2 超时失败 → 任务2 应该被清理,但...
        ↓ 如果 removeJob 失败或网络中断
        → 任务2 成为僵尸任务 ❌
t=4s    API3 返回成功 → 任务3 获得 requestId,开始轮询 ✅

结果:
- 任务1, 3 正常轮询
- 任务2 卡在 'generating' 状态,永远不会完成
```

### 📊 问题复现条件总结

| 条件 | 概率 | 影响 |
|------|------|------|
| 网络不稳定 | 高 | 导致 API 超时,任务未清理 |
| API 服务器响应慢 | 中 | 超过30秒超时,任务卡住 |
| 快速并发创建任务 | 中 | 增加时序问题出现概率 |
| 页面刷新 | 中 | 状态不一致,僵尸任务 |
| 浏览器崩溃恢复 | 低 | 状态完全丢失或不一致 |

---

## 🛠️ 修复方案

### 方案概述

采用 **状态一致性检查 + 健康检查定时器** 的组合方案:

1. **新增常量**:
   - `MAX_GENERATING_DURATION = 5分钟`: 任务创建最大等待时间
   - `HEALTH_CHECK_INTERVAL = 30秒`: 健康检查执行间隔

2. **新增功能**:
   - `cleanInvalidJobs()`: 清理无效任务函数
   - 健康检查定时器: 每30秒自动清理

3. **清理规则**:
   - 规则1: `status='generating'` 超过5分钟 → 标记为失败
   - 规则2: `status='processing/queued'` 但无 `requestId` → 标记为失败
   - 规则3: `status='completed/failed'` 但仍在轮询 → 停止轮询

### 技术实现

#### 1. 新增常量定义

**位置:** `use-video-polling.ts` 第 39-40 行

```typescript
const MAX_CONCURRENT_POLLS = 3 // 限制最大并发轮询数量,防止资源耗尽
const MAX_GENERATING_DURATION = 5 * 60 * 1000 // 🔥 最大任务创建等待时间(5分钟)
const HEALTH_CHECK_INTERVAL = 30000 // 🔥 健康检查间隔(30秒)
```

#### 2. 实现清理无效任务函数

**位置:** `use-video-polling.ts` 第 70-105 行

```typescript
// 🔥 清理无效任务的函数,防止僵尸轮询
const cleanInvalidJobs = useCallback(() => {
  const now = Date.now()

  videoContext.activeJobs.forEach(job => {
    // 检查1: 任务状态为 'generating' 超过5分钟 → 标记为失败
    // 这通常意味着任务创建过程中出现了问题(API超时、网络中断等)
    if (job.status === 'generating') {
      const taskAge = now - new Date(job.createdAt).getTime()
      if (taskAge > MAX_GENERATING_DURATION) {
        console.warn(`🧹 清理超时的 generating 任务: ${job.id} (${Math.floor(taskAge / 1000)}秒)`)
        videoContext.failJob(job.id, "Task creation timeout - please try again")
        return
      }
    }

    // 检查2: 任务状态为 'processing'/'queued'/'created' 但无 requestId → 标记为失败
    // 这是不合法的状态,任务不可能在没有 requestId 的情况下进入这些状态
    if ((job.status === 'processing' || job.status === 'queued' || job.status === 'created') && !job.requestId) {
      console.warn(`🧹 清理无 requestId 的任务: ${job.id}, status: ${job.status}`)
      videoContext.failJob(job.id, "Invalid task state - missing request ID")
      return
    }

    // 检查3: 任务在 pollingJobIds 中,但已经 completed/failed → 清理轮询
    if ((job.status === 'completed' || job.status === 'failed') && pollingJobIds.has(job.id)) {
      console.warn(`🧹 清理已完成但仍在轮询的任务: ${job.id}`)
      stoppedJobIdsRef.current.add(job.id)
      setPollingJobIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(job.id)
        return newSet
      })
    }
  })
}, [videoContext, pollingJobIds])
```

#### 3. 添加健康检查定时器

**位置:** `use-video-polling.ts` 第 886-899 行

```typescript
// 🔥 健康检查定时器,定期清理无效任务
useEffect(() => {
  // 立即执行一次清理
  cleanInvalidJobs()

  // 每30秒执行一次健康检查
  const healthCheckTimer = setInterval(() => {
    cleanInvalidJobs()
  }, HEALTH_CHECK_INTERVAL)

  return () => {
    clearInterval(healthCheckTimer)
  }
}, [cleanInvalidJobs])
```

---

## 📊 修复效果

### 修复前

```
场景: API 超时,任务创建失败

t=0s    创建任务 { status: 'generating', requestId: '' }
        ↓ UI 显示进度条

t=10s   API 超时失败
        ↓ 任务未清理(网络中断)

t=∞     任务永远卡在 'generating' 状态
        ❌ UI 一直显示进度条
        ❌ 用户无法操作,只能刷新页面
```

### 修复后

```
场景: API 超时,任务创建失败

t=0s    创建任务 { status: 'generating', requestId: '' }
        ↓ UI 显示进度条

t=10s   API 超时失败
        ↓ 任务未清理(网络中断)

t=30s   ✅ 健康检查触发
        ↓ 检测到任务 'generating' 超过5分钟

        ❌ 等等,才30秒,不到5分钟!
        → 任务继续保留

t=5分钟 ✅ 健康检查触发
        ↓ 检测到任务 'generating' 超过5分钟
        ↓ 调用 failJob(id, "Task creation timeout")

        ✅ 任务被标记为失败
        ✅ UI 显示错误状态
        ✅ 用户可以重试
```

### 对比表

| 指标 | 修复前 | 修复后 |
|------|--------|--------|
| 僵尸任务检测 | ❌ 无 | ✅ 每30秒检测一次 |
| 最长卡住时间 | ∞ (永久) | 5分钟 |
| 自动清理 | ❌ 否 | ✅ 是 |
| 用户体验 | 需要刷新页面 | 自动显示错误,可重试 |
| 内存泄漏风险 | 高 | 低 |

---

## 🔍 清理规则详解

### 规则 1: 清理超时的 'generating' 任务

**触发条件:**
- `job.status === 'generating'`
- `taskAge > 5分钟`

**判断逻辑:**

```typescript
if (job.status === 'generating') {
  const taskAge = now - new Date(job.createdAt).getTime()
  if (taskAge > MAX_GENERATING_DURATION) {
    console.warn(`🧹 清理超时的 generating 任务: ${job.id}`)
    videoContext.failJob(job.id, "Task creation timeout - please try again")
  }
}
```

**为什么是 5 分钟?**

- 正常情况下,API 调用应该在 10 秒内完成
- 即使网络很慢,30 秒也足够了
- 5 分钟是一个非常宽松的超时时间
- 如果 5 分钟都没完成,肯定是出问题了

**可能的原因:**
- API 服务器挂了
- 网络完全中断
- 浏览器进入后台被挂起
- 代码 bug 导致状态未更新

### 规则 2: 清理无 requestId 的非法状态

**触发条件:**
- `job.status === 'processing' || 'queued' || 'created'`
- `!job.requestId`

**判断逻辑:**

```typescript
if ((job.status === 'processing' || job.status === 'queued' || job.status === 'created')
    && !job.requestId) {
  console.warn(`🧹 清理无 requestId 的任务: ${job.id}, status: ${job.status}`)
  videoContext.failJob(job.id, "Invalid task state - missing request ID")
}
```

**为什么这是非法状态?**

根据任务状态机:

```
generating (无 requestId)
    ↓ API 调用成功
processing (有 requestId) ← 正常状态
    ↓
queued/created (有 requestId)
    ↓
completed/failed
```

**不可能出现的状态:**
- `processing` 且无 `requestId` ❌
- `queued` 且无 `requestId` ❌
- `created` 且无 `requestId` ❌

**如果出现,说明:**
- 代码 bug (状态更新顺序错误)
- 数据损坏
- 恶意操作

### 规则 3: 清理已完成但仍在轮询的任务

**触发条件:**
- `job.status === 'completed' || 'failed'`
- `pollingJobIds.has(job.id)`

**判断逻辑:**

```typescript
if ((job.status === 'completed' || job.status === 'failed')
    && pollingJobIds.has(job.id)) {
  console.warn(`🧹 清理已完成但仍在轮询的任务: ${job.id}`)
  stoppedJobIdsRef.current.add(job.id)
  setPollingJobIds(prev => {
    const newSet = new Set(prev)
    newSet.delete(job.id)
    return newSet
  })
}
```

**为什么会出现这种情况?**

- 轮询停止逻辑失败
- React 状态更新时序问题
- 组件卸载不完整

**影响:**
- 浪费网络资源 (继续发送无意义的请求)
- 浪费 CPU 资源 (定时器仍在运行)
- 可能导致内存泄漏

---

## 🚀 性能影响

### 健康检查开销

```typescript
// 每30秒执行一次
setInterval(() => {
  cleanInvalidJobs() // 遍历所有 activeJobs
}, 30000)
```

**时间复杂度:** O(n), n = activeJobs.length

**性能分析:**

| activeJobs 数量 | 每次检查耗时 | 是否可接受 |
|----------------|-------------|-----------|
| 1-10 | < 1ms | ✅ 优秀 |
| 10-50 | 1-5ms | ✅ 良好 |
| 50-100 | 5-10ms | ✅ 可接受 |
| 100+ | 10-50ms | ⚠️ 需优化 |

**优化建议:**

如果用户同时有 100+ 个任务 (极端情况):

```typescript
// 方案1: 增加检查间隔
const HEALTH_CHECK_INTERVAL = 60000 // 改为60秒

// 方案2: 分批检查
const BATCH_SIZE = 20
for (let i = 0; i < jobs.length; i += BATCH_SIZE) {
  const batch = jobs.slice(i, i + BATCH_SIZE)
  batch.forEach(checkJob)
  if (i + BATCH_SIZE < jobs.length) {
    await new Promise(resolve => setTimeout(resolve, 10))
  }
}
```

---

## 🧪 测试验证

### 手动测试场景

#### 测试 1: 模拟 API 超时

```javascript
// 1. 修改代码,添加人工延迟
const response = await fetch('/api/video/generate', ...)

// 改为:
await new Promise(resolve => setTimeout(resolve, 10000)) // 10秒延迟
throw new Error('API Timeout') // 然后抛出错误

// 2. 点击生成视频
// 3. 等待 5分钟
// 4. 预期: 任务被自动标记为失败
```

#### 测试 2: 模拟网络中断

```javascript
// 1. 打开 Chrome DevTools
// 2. Network 面板 → Throttling → Offline
// 3. 点击生成视频
// 4. 等待 5分钟
// 5. 预期: 任务被自动标记为失败
```

#### 测试 3: 模拟并发创建

```javascript
// 1. 快速点击 5 次生成按钮
// 2. 让其中 2-3 个 API 调用失败
// 3. 等待 5分钟
// 4. 预期:
//    - 成功的任务正常轮询
//    - 失败的任务被自动清理
```

### 自动化测试 (Jest)

```typescript
describe('cleanInvalidJobs', () => {
  it('should clean generating tasks older than 5 minutes', () => {
    const oldJob = {
      id: 'job_1',
      status: 'generating',
      requestId: '',
      createdAt: new Date(Date.now() - 6 * 60 * 1000).toISOString() // 6分钟前
    }

    const { result } = renderHook(() => useVideoPolling())

    act(() => {
      videoContext.addJob(oldJob)
    })

    // 等待健康检查执行
    jest.advanceTimersByTime(HEALTH_CHECK_INTERVAL)

    expect(videoContext.failJob).toHaveBeenCalledWith(
      'job_1',
      'Task creation timeout - please try again'
    )
  })

  it('should clean processing tasks without requestId', () => {
    const invalidJob = {
      id: 'job_2',
      status: 'processing',
      requestId: '', // ❌ 非法状态
      createdAt: new Date().toISOString()
    }

    const { result } = renderHook(() => useVideoPolling())

    act(() => {
      videoContext.addJob(invalidJob)
    })

    jest.advanceTimersByTime(HEALTH_CHECK_INTERVAL)

    expect(videoContext.failJob).toHaveBeenCalledWith(
      'job_2',
      'Invalid task state - missing request ID'
    )
  })
})
```

---

## 📝 配置参数调优

### 当前默认值

```typescript
const MAX_GENERATING_DURATION = 5 * 60 * 1000 // 5分钟
const HEALTH_CHECK_INTERVAL = 30000 // 30秒
```

### 根据场景调整

#### 场景 1: 网络环境良好

```typescript
const MAX_GENERATING_DURATION = 2 * 60 * 1000 // 2分钟 (更激进)
const HEALTH_CHECK_INTERVAL = 15000 // 15秒 (更频繁)
```

**优点:**
- 更快发现和清理问题任务
- 更好的用户体验

**缺点:**
- 可能误杀正常但慢的任务
- 增加 CPU 开销

#### 场景 2: 网络环境较差

```typescript
const MAX_GENERATING_DURATION = 10 * 60 * 1000 // 10分钟 (更宽松)
const HEALTH_CHECK_INTERVAL = 60000 // 60秒 (更保守)
```

**优点:**
- 避免误杀慢速任务
- 降低 CPU 开销

**缺点:**
- 僵尸任务存在时间更长
- 用户等待时间更长

#### 场景 3: 生产环境推荐

```typescript
const MAX_GENERATING_DURATION = 5 * 60 * 1000 // 5分钟 (平衡)
const HEALTH_CHECK_INTERVAL = 30000 // 30秒 (平衡)
```

这是最平衡的配置,适合大多数场景。

---

## 🔄 后续优化建议

### 优化 1: 添加用户提示

```typescript
if (job.status === 'generating') {
  const taskAge = now - new Date(job.createdAt).getTime()

  // 🔥 3分钟时给用户提示,但不清理
  if (taskAge > 3 * 60 * 1000 && taskAge < MAX_GENERATING_DURATION) {
    toast.warning('Video generation is taking longer than usual. Please wait...')
  }

  // 5分钟后清理
  if (taskAge > MAX_GENERATING_DURATION) {
    videoContext.failJob(job.id, "Task creation timeout")
  }
}
```

### 优化 2: 持久化任务状态

```typescript
// 将任务状态保存到 localStorage
useEffect(() => {
  localStorage.setItem('activeJobs', JSON.stringify(videoContext.activeJobs))
}, [videoContext.activeJobs])

// 页面加载时恢复
useEffect(() => {
  const savedJobs = localStorage.getItem('activeJobs')
  if (savedJobs) {
    const jobs = JSON.parse(savedJobs)
    jobs.forEach(job => {
      // 清理超时的任务
      cleanInvalidJobs()

      // 恢复有效的任务轮询
      if (job.requestId && job.status === 'processing') {
        startPolling(job.id)
      }
    })
  }
}, [])
```

### 优化 3: 指数退避重试

```typescript
// 为超时的任务提供自动重试
if (taskAge > MAX_GENERATING_DURATION) {
  const retryCount = job.metadata?.retryCount || 0

  if (retryCount < 3) {
    // 自动重试
    regenerateVideo(job.prompt, job.settings, {
      metadata: { retryCount: retryCount + 1 }
    })
  } else {
    // 超过3次重试,标记为失败
    videoContext.failJob(job.id, "Task failed after 3 retries")
  }
}
```

### 优化 4: 监控和告警

```typescript
// 记录僵尸任务的统计数据
const zombieTaskStats = {
  total: 0,
  byReason: {
    'generating_timeout': 0,
    'missing_requestId': 0,
    'stuck_polling': 0
  }
}

const cleanInvalidJobs = () => {
  videoContext.activeJobs.forEach(job => {
    if (job.status === 'generating' && taskAge > MAX_GENERATING_DURATION) {
      zombieTaskStats.total++
      zombieTaskStats.byReason.generating_timeout++

      // 发送到监控系统
      analytics.track('zombie_task_cleaned', {
        reason: 'generating_timeout',
        taskAge: taskAge,
        jobId: job.id
      })

      videoContext.failJob(job.id, "Task creation timeout")
    }
  })
}
```

---

## 总结

### 问题

僵尸轮询 = 任务创建和轮询启动的时序漏洞导致的状态不一致

### 修复

1. ✅ 新增 `cleanInvalidJobs()` 函数
2. ✅ 添加健康检查定时器 (每30秒)
3. ✅ 三层清理规则全面覆盖异常场景

### 效果

- ✅ 僵尸任务最长存在时间: ∞ → 5分钟
- ✅ 自动清理无需用户干预
- ✅ 更好的用户体验

### 影响文件

- `hooks/use-video-polling.ts`: 核心修复
- `docs/fix-zombie-polling.md`: 问题分析文档

### 向后兼容性

✅ 完全向后兼容,无破坏性变更
