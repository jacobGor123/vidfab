# 轮询任务逻辑严重问题修复总结

## 修复时间
2025-10-17

## 修复位置
`/Users/jacob/Desktop/vidfab/hooks/use-video-polling.ts`

---

## 🔴 严重问题修复详情

### 1. ✅ 递归 setTimeout 内存泄漏问题

**问题描述**:
- `saveVideoToDatabase` 函数使用递归 `setTimeout` 进行重试
- 未追踪 timeout ID,导致组件卸载时无法清理
- 可能导致内存泄漏和无效 API 调用

**修复方案**:
```typescript
// 新增追踪 ref
const retryTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map())

// 在创建 timeout 时追踪
const newTimeoutId = setTimeout(() => {
  retryTimeoutsRef.current.delete(retryTimeoutKey)
  saveVideoToDatabase(job, resultUrl, retryCount + 1)
}, STORAGE_RETRY_DELAY * (retryCount + 1))
retryTimeoutsRef.current.set(retryTimeoutKey, newTimeoutId)

// 在成功/失败/停止时清理
if (retryTimeoutsRef.current.has(retryTimeoutKey)) {
  clearTimeout(retryTimeoutsRef.current.get(retryTimeoutKey)!)
  retryTimeoutsRef.current.delete(retryTimeoutKey)
}

// 组件卸载时清理所有
useEffect(() => {
  return () => {
    retryTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
    retryTimeoutsRef.current.clear()
  }
}, [])
```

**修复位置**:
- 58-59 行: 添加 `retryTimeoutsRef` 追踪
- 126-141 行: 创建可追踪的重试 timeout
- 99-104 行: 成功时清理 timeout
- 144-149 行: 失败时清理 timeout
- 605-610 行: `stopPolling` 中清理 timeout
- 624-626 行: 停止所有轮询时清理
- 763-765 行: 组件卸载时清理

---

### 2. ✅ 轮询停止的竞态条件问题

**问题描述**:
- `pollJobStatus` 中存在 check-then-act 竞态条件
- 检查 `stoppedJobIdsRef` 后,在 fetch 期间可能调用 `stopPolling`
- 导致已停止的任务继续处理响应,状态不一致

**修复方案**:
```typescript
// 新增 AbortController 追踪
const abortControllersRef = useRef<Map<string, AbortController>>(new Map())

// 为每个轮询请求创建 AbortController
const controller = new AbortController()
abortControllersRef.current.set(jobId, controller)

const response = await fetch(`/api/video/status/${job.requestId}`, {
  signal: controller.signal, // 支持主动取消
  // ...
})

// 在关键异步操作点多次检查
if (stoppedJobIdsRef.current.has(jobId)) {
  abortControllersRef.current.delete(jobId)
  return
}

// stopPolling 时主动取消请求
const controller = abortControllersRef.current.get(jobId)
if (controller) {
  controller.abort()
  abortControllersRef.current.delete(jobId)
}
```

**修复位置**:
- 61-62 行: 添加 `abortControllersRef` 追踪
- 184-186 行: 创建 AbortController
- 189-193, 203-206, 232-235 行: 多次检查停止状态
- 196-200 行: fetch 添加 abort signal
- 219, 274, 293, 342, 368, 371, 376 行: 各状态分支清理 controller
- 380-386 行: 处理 AbortError
- 598-603 行: `stopPolling` 中取消请求
- 620-622 行: 停止所有轮询时取消所有请求
- 767-769 行: 组件卸载时取消所有请求

---

### 3. ✅ 轮询恢复的无限循环风险

**问题描述**:
- 自动恢复轮询的 effect 依赖 `videoContext`
- `videoContext` 是对象引用,每次更新都触发 effect
- `startPolling` 可能触发状态更新,进而更新 `videoContext`
- 形成循环: videoContext 变化 → effect 重跑 → startPolling → videoContext 变化

**修复方案**:
```typescript
// 使用更精确的依赖追踪
const activeJobsLengthRef = useRef(0)
const lastCheckTimeRef = useRef(0)

useEffect(() => {
  const currentLength = videoContext.activeJobs.length
  const now = Date.now()

  // 防抖：至少间隔 3 秒
  if (now - lastCheckTimeRef.current < 3000) {
    return
  }

  // 仅在任务数量变化或有任务但无轮询时检查
  const shouldCheck =
    currentLength !== activeJobsLengthRef.current ||
    (currentLength > 0 && currentPollingCount === 0)

  if (!shouldCheck) return

  activeJobsLengthRef.current = currentLength
  lastCheckTimeRef.current = now

  // ... 恢复逻辑 ...
}, [videoContext?.activeJobs.length, pollingJobIds.size, enabled, startPolling])
```

**修复位置**:
- 724-725 行: 添加追踪 refs
- 734-737 行: 防抖机制 (3 秒间隔)
- 739-748 行: 精确触发条件
- 760-761 行: 不重启已停止的任务
- 775 行: 更精确的依赖项数组

---

### 4. ✅ 数据库操作缺少超时控制问题

**问题描述**:
- `saveVideoToDatabase` 中的 fetch 没有超时控制
- 如果 API 服务器无响应,请求会永久挂起
- 导致资源无法释放,用户界面卡住

**修复方案**:
```typescript
const saveVideoToDatabase = async (job, resultUrl, retryCount = 0) => {
  // 添加 30 秒超时控制
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 30000)

  try {
    const response = await fetch('/api/video/store', {
      signal: controller.signal, // 支持超时中断
      // ...
    })

    clearTimeout(timeoutId) // 成功后清理超时

    // ... 处理响应 ...
  } catch (error) {
    clearTimeout(timeoutId) // 错误后清理超时

    // 区分超时错误
    const errorMessage = error.name === 'AbortError'
      ? 'Storage request timed out'
      : error.message

    // ... 重试逻辑 ...
  }
}
```

**修复位置**:
- 69-71 行: 创建超时控制器
- 76 行: 添加 abort signal
- 91 行: 成功时清理超时
- 117 行: 错误时清理超时
- 120-122 行: 区分超时错误

---

## 附加改进

### 错误处理改进
- 所有异步操作都有明确的清理逻辑
- AbortError 被正确识别和处理,不会产生误导性日志

### 资源管理改进
- 组件卸载时彻底清理:
  - 所有定时器 (interval + setTimeout)
  - 所有进行中的 fetch 请求
  - 所有重试 timeout

### 日志改进
- 添加自动恢复轮询的日志: `🔄 自动恢复 N 个轮询任务`
- 添加取消日志: `轮询任务 xxx 已被取消`

---

## 测试建议

### 1. 内存泄漏测试
- 快速创建和删除多个视频任务
- 检查浏览器内存使用情况
- 验证 setTimeout 和 fetch 是否被正确清理

### 2. 竞态条件测试
- 在视频生成过程中快速离开页面
- 在视频生成过程中快速停止任务
- 验证不会有重复处理或状态错误

### 3. 无限循环测试
- 监控 console 日志,确认自动恢复不会频繁触发
- 检查 effect 重新运行频率

### 4. 超时测试
- 模拟慢速 API 响应 (>30秒)
- 验证请求会被正确超时和重试

---

## 影响评估

### 积极影响
- ✅ 消除内存泄漏风险
- ✅ 避免无效 API 调用
- ✅ 提升系统稳定性
- ✅ 改善资源释放

### 潜在风险
- ⚠️ 30 秒超时可能对慢速网络过于严格 (可根据实际情况调整)
- ⚠️ 3 秒防抖可能延迟轮询恢复 (可根据需要调整)

### 兼容性
- ✅ 完全向后兼容,不影响现有功能
- ✅ 不改变对外 API
- ✅ 仅改进内部实现

---

## 后续建议

1. **监控告警**: 建议在生产环境添加监控,追踪:
   - 轮询任务平均时长
   - 超时/取消频率
   - 重试成功率

2. **配置化**: 考虑将以下硬编码值改为可配置:
   - 超时时长 (30秒)
   - 防抖间隔 (3秒)
   - 最大重试次数 (3次)

3. **状态机**: 长期考虑引入状态机模式,更清晰地管理任务状态转换

4. **可观测性**: 添加更详细的日志和指标,便于问题诊断
