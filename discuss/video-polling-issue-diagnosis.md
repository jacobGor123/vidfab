# Video Polling 无法启动问题诊断

## 🚨 问题描述

用户点击 "Generate Video" 按钮后，右侧任务列表不显示任务，轮询没有被启动。这个问题同时影响 text-to-video 和 image-to-video 功能。

## 🔍 根本原因分析

经过深入代码分析，发现了以下关键问题：

### 1. **startPolling 的 requestId 检查过于严格**

**位置**: `/hooks/use-video-polling-v2.ts` 第 332-335 行

```typescript
const startPolling = useCallback((job: VideoJob) => {
  if (!job.requestId) {
    console.warn(`⚠️ [V2] Job ${job.id} missing requestId, skipping polling...`)
    return  // ⚠️ 直接返回，不启动轮询！
  }

  // ... 启动轮询逻辑
}, [unifiedPolling])
```

**问题**：如果传入的 `job` 对象的 `requestId` 为空（即使是空字符串 `''`），轮询会被直接跳过。

### 2. **onSuccess 回调中的 job 对象可能不完整**

**位置**: `/hooks/use-video-generation.tsx` 第 281-299 行

```typescript
// 第 229 行：创建 job，requestId 为空
const job = videoContext.addJob({
  requestId: '',  // ⚠️ 初始为空字符串
  userId: session.user.uuid,
  prompt: prompt || 'Convert image to video',
  settings: {...},
  status: 'generating',
  progress: 0
})

// 第 281-285 行：更新 job，设置 requestId
videoContext.updateJob(job.id, {
  requestId: data.data.requestId,
  reservationId: data.data.reservationId,
  status: 'processing'
})

// 第 288-293 行：创建 updatedJob 对象
const updatedJob = {
  ...job,  // ⚠️ 这是最初创建的 job，requestId 还是 ''
  requestId: data.data.requestId,  // 这里覆盖了 requestId
  reservationId: data.data.reservationId,
  status: 'processing' as const
}

// 第 299 行：调用 onSuccess
hookOptionsRef.current?.onSuccess?.(updatedJob, data.data.requestId)
```

**分析**：
- `job` 对象（第 229 行创建）的 `requestId` 初始为空字符串 `''`
- `videoContext.updateJob`（第 281 行）虽然更新了 context 中的任务状态，但并**不会**修改 `job` 变量本身
- `updatedJob` 通过解构 `job` 创建，然后覆盖 `requestId` 字段

**理论上**，`updatedJob.requestId` 应该有正确的值。但是存在以下风险：
1. 如果 `data.data.requestId` 本身为空或 undefined，`updatedJob.requestId` 也会是空的
2. 如果解构语法出现问题，`requestId` 可能不会被正确覆盖

### 3. **hookOptionsRef 的竞态条件**

**位置**: `/hooks/use-video-generation.tsx` 第 51-56 行

```typescript
const hookOptionsRef = useRef<UseVideoGenerationOptions>(options)

// 更新Hook选项ref
useEffect(() => {
  hookOptionsRef.current = options
}, [options])
```

**问题**：
- `hookOptionsRef` 初始值为传入的 `options`
- useEffect 会在**下一次渲染后**才更新 `hookOptionsRef.current`
- 如果 `generateImageToVideo` 在组件初始化时立即被调用（例如，用户快速点击按钮），`hookOptionsRef.current` 可能还是旧的或空的值

### 4. **可能的 API 响应问题**

**位置**: `/app/api/video/generate-image-to-video/route.ts`

如果后端 API 响应格式不正确，`data.data.requestId` 可能不存在：

```typescript
// 期望的响应格式
{
  "success": true,
  "data": {
    "requestId": "byteplus:xxxxxxxxxx"  // ⚠️ 如果这个字段缺失
  }
}
```

## 🎯 可能的故障路径

### 路径 1：API 响应缺失 requestId
```
用户点击按钮
  ↓
handleGenerate() → videoGeneration.generateImageToVideo()
  ↓
videoContext.addJob() → 创建 job (requestId: '')
  ↓
fetch('/api/video/generate-image-to-video')
  ↓
后端返回：{ data: { requestId: undefined } }  // ⚠️ 缺失或为空
  ↓
updatedJob.requestId = undefined
  ↓
onSuccess(updatedJob, undefined)
  ↓
startPolling(updatedJob) → if (!job.requestId) return  // ⚠️ 跳过轮询
```

### 路径 2：onSuccess 回调未被注册
```
用户点击按钮
  ↓
handleGenerate() → videoGeneration.generateImageToVideo()
  ↓
hookOptionsRef.current = undefined 或 { onSuccess: undefined }
  ↓
hookOptionsRef.current?.onSuccess?.(updatedJob, requestId)  // ⚠️ 不执行
  ↓
startPolling 从未被调用
```

### 路径 3：job 对象在传递过程中丢失 requestId
```
updatedJob = { ...job, requestId: data.data.requestId }
  ↓
某种原因导致 requestId 被覆盖或丢失
  ↓
startPolling(job without requestId)
  ↓
跳过轮询
```

## 🔧 建议的修复方案

### 方案 1：增强 startPolling 的容错性（推荐）

**修改**: `/hooks/use-video-polling-v2.ts` 第 325-353 行

```typescript
const startPolling = useCallback((job: VideoJob) => {
  // 🔥 增强验证：确保 job 对象完整有效
  if (!job || !job.id) {
    console.error(`❌ [V2] Invalid job object:`, job)
    return
  }

  if (!job.requestId) {
    console.error(`❌ [V2] Critical: Job ${job.id} missing requestId!`)
    console.error(`Job details:`, JSON.stringify(job, null, 2))

    // 🔥 不要直接返回，尝试延迟重试
    setTimeout(() => {
      const updatedJob = videoContext.activeJobs.find(j => j.id === job.id)
      if (updatedJob && updatedJob.requestId) {
        console.log(`✅ [V2] Retry successful: Job ${job.id} now has requestId`)
        startPolling(updatedJob)
      } else {
        console.error(`❌ [V2] Retry failed: Job ${job.id} still missing requestId`)
      }
    }, 500)
    return
  }

  // 准备任务数据
  const jobData: VideoJobData = {
    userId: job.userId,
    userEmail: job.userEmail,
    prompt: job.prompt,
    sourceImage: job.sourceImage,
    effectId: job.effectId,
    effectName: job.effectName,
    generationType: job.generationType,
    settings: job.settings
  }

  console.log(`🚀 [V2] Starting polling for job ${job.id} with requestId ${job.requestId}`)
  unifiedPolling.startPolling(job.requestId, job.id, jobData)

  // 🔥 生成开始时立即刷新积分
  emitCreditsUpdated('video-started')
}, [unifiedPolling, videoContext.activeJobs])
```

### 方案 2：增强 generateImageToVideo 的日志和错误处理

**修改**: `/hooks/use-video-generation.tsx` 第 266-301 行

```typescript
const data = await response.json()

console.log(`📦 API Response:`, data)

if (!response.ok) {
  videoContext.removeJob(job.id)
  throw new Error(data.error || `HTTP ${response.status}`)
}

// 🔥 第1层防护：验证 requestId 是否存在
if (!data.data?.requestId) {
  console.error(`❌ API response missing requestId:`, data)
  videoContext.removeJob(job.id)
  throw new Error('API response is missing requestId')
}

console.log(`✅ Received requestId: ${data.data.requestId}`)

// 🔥 更新job的requestId和reservationId
videoContext.updateJob(job.id, {
  requestId: data.data.requestId,
  reservationId: data.data.reservationId,
  status: 'processing'
})

// 🔥 创建更新后的完整 job 对象
const updatedJob = {
  ...job,
  requestId: data.data.requestId,
  reservationId: data.data.reservationId,
  status: 'processing' as const
}

console.log(`📋 Updated job:`, {
  id: updatedJob.id,
  requestId: updatedJob.requestId,
  status: updatedJob.status
})

// 🔥 重置生成状态
setState(prev => ({ ...prev, isGenerating: false }))

// 🔥 修复：直接传递完整的 job 对象，避免从 context 查找导致的竞态条件
console.log(`🎯 Calling onSuccess callback...`)
hookOptionsRef.current?.onSuccess?.(updatedJob, data.data.requestId)

return job.id
```

### 方案 3：在 image-to-video-panel.tsx 中增强 onSuccess 回调

**修改**: `/components/create/image-to-video-panel.tsx` 第 123-148 行

```typescript
const videoGeneration = useVideoGeneration({
  onSuccess: (job, requestId) => {
    console.log(`🎉 [ImageToVideo] onSuccess triggered:`, {
      jobId: job.id,
      requestId,
      jobRequestId: job.requestId,
      hasRequestId: !!job.requestId
    })

    // 🔥 验证 job 对象
    if (!job.requestId) {
      console.error(`❌ [ImageToVideo] Job missing requestId in onSuccess callback!`)
      console.error(`Job details:`, JSON.stringify(job, null, 2))
      return
    }

    // 🔥 Analytics: 追踪后端开始生成
    GenerationAnalytics.trackGenerationStarted({
      generationType: 'image-to-video',
      jobId: job.id,
      requestId,
      modelType: params.model,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      resolution: params.resolution,
      creditsRequired: getCreditsRequired(),
    })

    // ✅ 直接使用传入的 job 对象，不再从 videoContext 查找
    console.log(`🚀 [ImageToVideo] Calling startPolling...`)
    startPolling(job)
    console.log(`✅ [ImageToVideo] startPolling called successfully`)
  },
  onError: (error) => {
    console.error('❌ [ImageToVideo] Generation failed:', error)
  },
  onAuthRequired: () => {
    authModal.showAuthModal()
  }
})
```

### 方案 4：后端 API 响应验证

**修改**: `/app/api/video/generate-image-to-video/route.ts`

在返回响应前，确保 requestId 存在：

```typescript
// 提交生成任务
const requestId = await submitBytePlusVideoGeneration({
  image: imageUrl,
  prompt: requestBody.prompt,
  model: requestBody.model,
  duration: requestBody.duration,
  resolution: requestBody.resolution,
  aspectRatio: requestBody.aspectRatio
})

console.log(`✅ Generation submitted successfully, requestId: ${requestId}`)

// 🔥 严格验证 requestId
if (!requestId || requestId.trim() === '') {
  console.error(`❌ API returned empty requestId`)
  throw new Error('API returned empty requestId')
}

return NextResponse.json({
  success: true,
  data: {
    requestId: requestId,
    reservationId: reservation?.id,
    message: 'Video generation started'
  }
})
```

## 📊 调试步骤

1. **在浏览器控制台中检查**：
   - 打开浏览器开发者工具
   - 切换到 Console 标签
   - 点击 Generate Video 按钮
   - 查看是否有以下日志：
     - `⚠️ [V2] Job ... missing requestId`
     - `❌ API response missing requestId`
     - `🎯 Calling onSuccess callback...`

2. **在 Network 标签中检查**：
   - 查看 `/api/video/generate-image-to-video` 请求的响应
   - 验证响应格式是否正确
   - 确认 `data.requestId` 字段存在且不为空

3. **在 React DevTools 中检查**：
   - 查看 `videoContext.activeJobs` 的内容
   - 确认创建的任务是否有正确的 `requestId`

## ✅ 推荐的修复顺序

1. **立即执行方案 2**（增加日志）→ 快速定位问题
2. **执行方案 3**（前端回调验证）→ 增强容错性
3. **执行方案 4**（后端验证）→ 确保数据正确性
4. **最后执行方案 1**（延迟重试）→ 作为最后的防护网

## 🎯 预期效果

修复后，应该能在控制台看到完整的日志链路：

```
📦 API Response: { success: true, data: { requestId: "byteplus:xxx" } }
✅ Received requestId: byteplus:xxx
📋 Updated job: { id: "job_xxx", requestId: "byteplus:xxx", status: "processing" }
🎯 Calling onSuccess callback...
🎉 [ImageToVideo] onSuccess triggered: { jobId: "job_xxx", requestId: "byteplus:xxx", ... }
🚀 [ImageToVideo] Calling startPolling...
🚀 [V2] Starting polling for job job_xxx with requestId byteplus:xxx
✅ [ImageToVideo] startPolling called successfully
```

如果任何一步缺失，就能快速定位问题所在。
