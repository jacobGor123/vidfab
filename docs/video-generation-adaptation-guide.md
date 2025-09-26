# 视频生成状态管理适配指南

本文档详细说明了如何在现有的text-to-video架构基础上，无缝适配image-to-video功能。

## 核心设计原则

### 1. 完全向后兼容
- 所有现有的text-to-video功能保持不变
- 现有组件无需修改即可继续工作
- 渐进式升级，支持混合使用

### 2. 统一接口设计
- 单一的`VideoGenerationRequest`类型支持两种模式
- 智能检测生成类型（通过`image`参数存在性）
- 统一的API调用和状态管理

### 3. 复用现有架构
- 完全复用`VideoContext`
- 复用`useVideoGeneration`、`useVideoPolling`等hooks
- 复用认证、存储、跨组件通信机制

## 类型系统扩展

### 新增类型定义

```typescript
// 基础参数（保持兼容）
interface BaseVideoGenerationRequest {
  prompt: string
  model: string
  duration: number
  resolution: string
  aspectRatio: string
  seed?: number
  cameraFixed?: boolean
}

// 扩展支持image参数
interface VideoGenerationRequest extends BaseVideoGenerationRequest {
  image?: string  // Base64编码的图片或图片URL
  imageStrength?: number  // 图片影响强度 0.1-1.0
}

// 生成类型枚举
type VideoGenerationType = "text-to-video" | "image-to-video"
```

### 类型检测函数

```typescript
// 自动检测生成类型
function getGenerationType(request: VideoGenerationRequest): VideoGenerationType {
  return request.image ? "image-to-video" : "text-to-video"
}

// 图片数据验证
function validateImageData(image: string): boolean
function validateImageFormat(image: string): boolean
function getImageSize(image: string): number
```

## Context适配策略

### VideoContext保持不变
现有的`VideoContext`无需修改，只在`addJob`方法中增加了生成类型的自动识别：

```typescript
const addJob = useCallback((jobData: Omit<VideoJob, "id" | "createdAt" | "updatedAt">): VideoJob => {
  const job: VideoJob = {
    ...jobData,
    id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // 自动识别生成类型
    generationType: jobData.sourceImage ? "image-to-video" : "text-to-video"
  }

  dispatch({ type: "ADD_JOB", payload: job })
  return job
}, [])
```

### 状态隔离和共享策略
- **共享状态**：认证、轮询、存储机制完全共享
- **隔离状态**：通过`generationType`字段区分任务类型
- **数据结构**：扩展`VideoJob`支持`sourceImage`和`generationType`字段

## Hooks复用方案

### useVideoGeneration适配

```typescript
// 在生成前验证参数
const generationType = getGenerationType(request)

// Image-to-video特有验证
if (generationType === "image-to-video") {
  if (!request.image) {
    throw new Error("Image-to-video generation requires an image")
  }
  if (!validateImageData(request.image)) {
    throw new Error("Invalid image format")
  }
}

// 创建任务时包含image信息
const localJob = videoContext.addJob({
  // ... 其他参数
  settings: {
    // ... 其他设置
    imageStrength: request.imageStrength,
    generationType
  },
  sourceImage: request.image,
  generationType
})
```

### useVideoPolling保持不变
轮询逻辑完全不需要修改，因为：
- API状态检查接口相同
- 轮询机制通用
- 完成回调处理通用

### useVideoGenerationAuth通用
认证逻辑完全通用，无需任何修改。

## API调用适配

### 统一的API端点
只需一个`/api/video/generate`端点，内部自动路由：

```typescript
// 根据生成类型调用统一的API
const generationType = getGenerationType(body)
const result = await submitVideoGeneration(body)  // 内部自动处理两种类型
```

### Wavespeed API适配
```typescript
// 统一的提交函数，自动处理两种模式
export async function submitVideoGeneration(request: VideoGenerationRequest) {
  const generationType = getGenerationType(request)

  // 构建API请求参数
  const apiRequest: any = {
    prompt: request.prompt,
    duration: DURATION_MAP[`${request.duration}s`] || request.duration,
    camera_fixed: request.cameraFixed ?? false,
    seed: request.seed ?? -1,
  }

  // Text-to-video: 添加aspect_ratio
  if (generationType === "text-to-video") {
    apiRequest.aspect_ratio = request.aspectRatio
  }

  // Image-to-video: 添加image参数
  if (generationType === "image-to-video" && request.image) {
    apiRequest.image = request.image
  }

  // 选择对应的模型
  const modelKey = getModelKey(request.model, request.resolution, generationType)
  const apiModel = MODEL_API_MAP[modelKey]  // 支持i2v模型
}
```

## 数据流适配

### 参数传递路径
```
Frontend Component
  ↓ (VideoGenerationRequest with optional image)
useUnifiedVideoGeneration
  ↓ (自动类型检测)
useVideoGeneration
  ↓ (验证image参数)
VideoContext.addJob
  ↓ (保存sourceImage)
API /video/generate
  ↓ (自动路由)
Wavespeed API (t2v or i2v)
```

### 本地存储适配
```typescript
// localStorage keys保持不变
const STORAGE_KEYS = {
  ACTIVE_JOBS: "vidfab_active_video_jobs",      // 包含generationType
  COMPLETED_VIDEOS: "vidfab_completed_videos",  // 保持不变
  FAILED_JOBS: "vidfab_failed_jobs"             // 包含generationType
}
```

### BroadcastChannel通信
跨tab同步完全兼容，因为数据结构向后兼容。

## 统一的用户接口

### useUnifiedVideoGeneration Hook
为用户提供简洁的统一接口：

```typescript
const {
  // 统一方法
  generateVideo,

  // 专用方法（可选）
  generateTextToVideo,
  generateImageToVideo,

  // 状态控制
  isGenerating,
  error,
  clearError,

  // 轮询控制
  isPolling,
  startPolling,
  stopPolling,

  // 认证状态
  isAuthenticated,
  requireAuth
} = useUnifiedVideoGeneration({
  onSuccess: (jobId, generationType) => {
    console.log(`${generationType} generation started: ${jobId}`)
  }
})
```

## 使用示例

### Text-to-Video（现有功能）
```typescript
const { generateVideo } = useUnifiedVideoGeneration()

await generateVideo({
  prompt: "A beautiful sunset over the ocean",
  model: "vidu-q1",
  duration: 5,
  resolution: "720p",
  aspectRatio: "16:9"
})
```

### Image-to-Video（新功能）
```typescript
const { generateVideo } = useUnifiedVideoGeneration()

await generateVideo({
  prompt: "Make this image come alive with gentle movement",
  model: "vidu-q1",
  duration: 5,
  resolution: "720p",
  aspectRatio: "16:9",
  image: "data:image/jpeg;base64,/9j/4AAQ...",  // Base64图片
  imageStrength: 0.8
})
```

### 使用专用方法
```typescript
// 专用的image-to-video方法，类型更严格
const { generateImageToVideo } = useUnifiedVideoGeneration()

await generateImageToVideo({
  prompt: "Add dynamic movement to this scene",
  model: "vidu-q1",
  duration: 5,
  resolution: "720p",
  aspectRatio: "16:9",
  image: imageBase64,  // 必填
  imageStrength: 0.8
})
```

## 向后兼容性保证

### 1. 类型兼容
- 所有现有的`VideoGenerationRequest`调用保持有效
- 可选的`image`参数不影响现有代码

### 2. API兼容
- `/api/video/generate`端点保持不变
- 自动检测请求类型，无需修改调用方式

### 3. 状态兼容
- `VideoContext`接口完全不变
- `useVideoGeneration`接口完全不变
- localStorage和BroadcastChannel数据结构向后兼容

### 4. 组件兼容
- 现有组件无需任何修改
- 可以渐进式地升级使用新功能

## 性能优化建议

### 1. 图片处理
```typescript
// 图片大小限制和格式验证
if (imageSize > 10 * 1024 * 1024) {
  throw new Error("Image size must be less than 10MB")
}

// 支持的格式
const supportedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
```

### 2. 内存管理
- 不在localStorage中存储完整图片数据
- 在`sourceImage`字段中仅临时保存，完成后清理
- BroadcastChannel通信时排除图片数据

### 3. 网络优化
- 图片数据仅在API调用时传输
- 使用适当的图片压缩和格式

## 错误处理策略

### 1. 验证层级
```typescript
// 前端验证
validateImageData(request.image)      // 格式验证
validateImageFormat(request.image)    // 类型验证
getImageSize(request.image)          // 大小验证

// 后端验证
validateVideoRequest(request)         // 统一验证
```

### 2. 错误分类
- **格式错误**：图片格式不支持
- **大小错误**：图片过大
- **参数错误**：缺少必需参数
- **API错误**：服务端处理失败

## 总结

这个适配方案的核心优势：

1. **零破坏性**：现有功能完全不受影响
2. **高复用性**：最大化复用现有架构和代码
3. **类型安全**：TypeScript完全支持，编译时检查
4. **渐进升级**：可以逐步迁移到新接口
5. **统一体验**：用户无需学习两套不同的API

通过这个设计，你可以：
- 立即开始使用image-to-video功能
- 保持所有现有text-to-video功能正常工作
- 在合适的时候逐步升级到统一接口
- 享受类型安全和完整的开发体验