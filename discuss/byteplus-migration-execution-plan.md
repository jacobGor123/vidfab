# BytePlus API 迁移执行计划

> **目标**: 从 WaveSpeed AI 迁移到 BytePlus ModelArk
> **涉及服务**: Seedance Video + Seedream 4.0 Image
> **预计时间**: 7-11 天
> **执行人**: 开发团队

---

## 📚 前置阅读

**必读文档**:
1. `discuss/byteplus-api-migration-research.md` - 完整调研报告
2. 截图文档:
   - `.playwright-mcp/seedance-api-documentation.png` - Video API 文档
   - `.playwright-mcp/seedream-4-api-doc.png` - Image API 文档
   - `.playwright-mcp/video-task-query-api.png` - 任务查询 API

**关键配置**:
- API Key: 已配置在 `.env` 和 `.local-env`
- Base URL: `https://ark.ap-southeast.bytepluses.com/api/v3`

---

## 🎯 总体架构设计

### 目标目录结构

```
lib/services/byteplus/
├── core/
│   ├── client.ts              # 统一 HTTP 客户端
│   ├── errors.ts              # 错误类型定义
│   └── retry.ts               # 重试逻辑
├── video/
│   ├── seedance-api.ts        # Video API 实现
│   ├── types.ts               # Video 类型定义
│   └── utils.ts               # Video 工具函数
└── image/
    ├── seedream-api.ts        # Image API 实现
    ├── types.ts               # Image 类型定义
    └── utils.ts               # Image 工具函数
```

---

## 🔧 阶段 1: 核心基础设施 (1-2天)

### 1.1 创建统一 HTTP 客户端

**文件**: `lib/services/byteplus/core/client.ts`

**功能需求**:
- ✅ 统一认证 (Bearer Token)
- ✅ 统一错误处理
- ✅ 统一日志记录
- ✅ 超时控制
- ✅ 请求重试(可选)

**关键代码框架**:
```typescript
export class BytePlusClient {
  private baseURL = process.env.BYTEPLUS_ARK_BASE_URL || 'https://ark.ap-southeast.bytepluses.com/api/v3'
  private apiKey = process.env.BYTEPLUS_ARK_API_KEY

  async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        ...options.headers,
      },
    })

    if (!response.ok) {
      throw await this.handleError(response)
    }

    return await response.json()
  }

  private async handleError(response: Response): Promise<BytePlusAPIError> {
    // 错误处理逻辑
  }
}
```

**测试要点**:
- ✅ 正确携带 Authorization header
- ✅ 400/500 错误正确抛出异常
- ✅ JSON 解析错误处理

---

### 1.2 创建错误类型

**文件**: `lib/services/byteplus/core/errors.ts`

```typescript
export class BytePlusAPIError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message)
    this.name = 'BytePlusAPIError'
  }
}
```

---

### 1.3 创建重试逻辑 (可选)

**文件**: `lib/services/byteplus/core/retry.ts`

```typescript
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  // 指数退避重试逻辑
}
```

---

## 🎬 阶段 2: Video API 迁移 (2-3天)

### 2.1 创建 Video 类型定义

**文件**: `lib/services/byteplus/video/types.ts`

**需要定义的类型**:

```typescript
// BytePlus 专用请求类型
export interface BytePlusVideoRequest {
  model: string
  content: BytePlusContent[]
  callback_url?: string
  return_last_frame?: boolean
}

export interface BytePlusContent {
  type: 'text' | 'image_url'
  text?: string  // 包含所有命令的 prompt
  image_url?: {
    url: string
    role?: 'first_frame' | 'last_frame'
  }
}

// BytePlus 响应类型
export interface BytePlusVideoResponse {
  id: string
  model: string
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  content?: {
    video_url?: string
    last_frame_url?: string
  }
  error?: {
    code: string
    message: string
  }
  created_at: number
  updated_at: number
  seed?: number
  resolution?: string
  ratio?: string
  duration?: number
  frames?: number
  framespersecond?: number
  usage?: {
    completion_tokens: number
    total_tokens: number
  }
}
```

---

### 2.2 创建参数转换工具

**文件**: `lib/services/byteplus/video/utils.ts`

**核心功能**: 将现有的 `VideoGenerationRequest` 转换为 BytePlus 格式

```typescript
import { VideoGenerationRequest } from '@/lib/types/video'
import { BytePlusVideoRequest, BytePlusContent } from './types'

/**
 * 构建带命令的 prompt
 * 这是最关键的函数!
 */
export function buildPromptWithCommands(request: VideoGenerationRequest): string {
  let prompt = request.prompt

  // 添加必需参数
  prompt += ` --resolution ${request.resolution}`
  prompt += ` --duration ${request.duration}`
  prompt += ` --ratio ${request.aspectRatio}`

  // 添加可选参数
  if (request.cameraFixed !== undefined) {
    prompt += ` --camerafixed ${request.cameraFixed}`
  }

  if (request.seed !== undefined && request.seed !== -1) {
    prompt += ` --seed ${request.seed}`
  }

  return prompt
}

/**
 * 将 VideoGenerationRequest 转换为 BytePlus 格式
 */
export function convertToBytepleusRequest(
  request: VideoGenerationRequest
): BytePlusVideoRequest {
  const content: BytePlusContent[] = []

  // 添加文本内容(包含所有命令)
  content.push({
    type: 'text',
    text: buildPromptWithCommands(request)
  })

  // 如果是 Image-to-Video，添加图片
  if (request.image) {
    content.push({
      type: 'image_url',
      image_url: {
        url: request.image,
        role: 'first_frame'  // 或根据需求设置
      }
    })
  }

  return {
    model: 'seedance-1-0-pro-fast-250528',  // 默认使用 Pro-Fast
    content,
    return_last_frame: false  // 根据需求配置
  }
}

/**
 * 状态映射
 */
export function mapBytePlusStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'queued': 'pending',
    'running': 'generating',
    'succeeded': 'completed',
    'failed': 'failed',
    'cancelled': 'failed'
  }
  return statusMap[status] || 'pending'
}
```

---

### 2.3 实现 Video API 服务

**文件**: `lib/services/byteplus/video/seedance-api.ts`

```typescript
import { BytePlusClient } from '../core/client'
import { VideoGenerationRequest, VideoGenerationResponse, VideoStatusResponse } from '@/lib/types/video'
import { convertToBytepleusRequest, mapBytePlusStatus } from './utils'
import { BytePlusVideoResponse } from './types'

const client = new BytePlusClient()

/**
 * 提交视频生成任务
 */
export async function submitVideoGeneration(
  request: VideoGenerationRequest
): Promise<VideoGenerationResponse> {
  // 转换为 BytePlus 格式
  const byteplusRequest = convertToBytepleusRequest(request)

  console.log('🚀 Submitting video generation to BytePlus:', {
    model: byteplusRequest.model,
    promptWithCommands: byteplusRequest.content[0].text,
    hasImage: byteplusRequest.content.length > 1
  })

  // 调用 BytePlus API
  const response = await client.request<{ id: string }>(
    '/contents/generations/tasks',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest)
    }
  )

  console.log('✅ Video generation submitted. Task ID:', response.id)

  return {
    data: {
      id: response.id
    }
  }
}

/**
 * 查询视频生成状态
 */
export async function checkVideoStatus(
  taskId: string
): Promise<VideoStatusResponse> {
  const response = await client.request<BytePlusVideoResponse>(
    `/contents/generations/tasks/${taskId}`,
    {
      method: 'GET'
    }
  )

  console.log('📊 Video status:', {
    taskId,
    status: response.status,
    hasVideo: !!response.content?.video_url
  })

  // 转换为现有格式
  return {
    data: {
      id: response.id,
      status: mapBytePlusStatus(response.status),
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      error: response.error?.message,
      progress: response.status === 'running' ? 50 : (response.status === 'succeeded' ? 100 : 0),
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString()
    }
  }
}
```

---

### 2.4 更新路由层

需要修改以下文件,导入新的 BytePlus API:

**文件 1**: `app/api/video/generate/route.ts`
```typescript
// 旧的导入
// import { submitVideoGeneration } from '@/lib/services/wavespeed-api'

// 新的导入
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'

// 其他代码保持不变
```

**文件 2**: `app/api/video/generate-image-to-video/route.ts`
```typescript
// 同上,替换导入
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
```

**文件 3**: `app/api/video/status/[requestId]/route.ts`
```typescript
// 旧的导入
// import { checkVideoStatus } from '@/lib/services/wavespeed-api'

// 新的导入
import { checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
```

---

### 2.5 测试 Video API

**测试清单**:

1. **Text-to-Video 测试**:
   ```bash
   # 测试创建任务
   curl -X POST http://localhost:3000/api/video/generate \
     -H "Cookie: your-session-cookie" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "A detective enters a room",
       "model": "vidfab-q1",
       "resolution": "720p",
       "duration": 5,
       "aspectRatio": "16:9"
     }'

   # 记录返回的 requestId
   # 测试查询状态
   curl http://localhost:3000/api/video/status/{requestId}
   ```

2. **Image-to-Video 测试**:
   ```bash
   curl -X POST http://localhost:3000/api/video/generate-image-to-video \
     -H "Cookie: your-session-cookie" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "The person moves",
       "image": "https://your-image-url.jpg",
       "model": "vidfab-q1",
       "resolution": "720p",
       "duration": 5,
       "aspectRatio": "16:9"
     }'
   ```

3. **验证点**:
   - ✅ 任务创建成功返回 requestId
   - ✅ 状态查询返回正确的状态
   - ✅ 生成完成后返回 video_url
   - ✅ 积分正确扣除
   - ✅ 错误情况下积分正确退还

---

## 🎨 阶段 3: Image API 迁移 (2-3天)

### 3.1 创建 Image 类型定义

**文件**: `lib/services/byteplus/image/types.ts`

```typescript
export interface BytePlusImageRequest {
  model: string
  prompt: string
  size?: string  // "2048x2048" 或 "2K"
  sequential_image_generation?: 'auto' | 'disabled'
  response_format?: 'url' | 'b64_json'
  stream?: boolean
  watermark?: boolean
  image?: string | string[]  // I2I 需要
}

export interface BytePlusImageResponse {
  model: string
  created: number
  data: Array<{
    url?: string
    b64_json?: string
    size?: string
  }>
  usage: {
    generated_images: number
    output_tokens: number
    total_tokens: number
  }
}
```

---

### 3.2 创建 Image 工具函数

**文件**: `lib/services/byteplus/image/utils.ts`

```typescript
/**
 * 将 AspectRatio 转换为 BytePlus Size 格式
 */
export function convertAspectRatioToSize(aspectRatio: string): string {
  const sizeMap: Record<string, string> = {
    "1:1": "2048x2048",
    "16:9": "2560x1440",
    "9:16": "1440x2560",
    "3:2": "2496x1664",
    "2:3": "1664x2496",
    "3:4": "1728x2304",
    "4:3": "2304x1728",
    "4:5": "1728x2160",
    "5:4": "2160x1728",
    "21:9": "3024x1296"
  }
  return sizeMap[aspectRatio] || "2048x2048"
}
```

---

### 3.3 实现 Image API 服务

**文件**: `lib/services/byteplus/image/seedream-api.ts`

```typescript
import { BytePlusClient } from '../core/client'
import { ImageGenerationRequest, ImageGenerationResponse } from '@/lib/types/image'
import { convertAspectRatioToSize } from './utils'
import { BytePlusImageRequest, BytePlusImageResponse } from './types'

const client = new BytePlusClient()

/**
 * 提交图片生成任务
 */
export async function submitImageGeneration(
  request: ImageGenerationRequest
): Promise<ImageGenerationResponse> {
  const byteplusRequest: BytePlusImageRequest = {
    model: 'seedream-4-0-250828',
    prompt: request.prompt,
    size: convertAspectRatioToSize(request.aspectRatio),
    sequential_image_generation: 'disabled',  // 单张生成
    response_format: 'url',
    stream: false,
    watermark: true
  }

  // Image-to-Image
  if (request.images && request.images.length > 0) {
    byteplusRequest.image = request.images.length === 1
      ? request.images[0]
      : request.images
  }

  console.log('🚀 Submitting image generation to BytePlus:', {
    model: byteplusRequest.model,
    size: byteplusRequest.size,
    hasInputImages: !!byteplusRequest.image
  })

  // BytePlus Image API 是同步返回的!
  const response = await client.request<BytePlusImageResponse>(
    '/images/generations',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest)
    }
  )

  console.log('✅ Image generation completed:', {
    generatedImages: response.usage.generated_images,
    imageUrl: response.data[0]?.url
  })

  // 转换为现有格式
  return {
    data: {
      id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      model: response.model
    }
  }
}

/**
 * 注意: BytePlus Image API 是同步的,不需要状态查询!
 * 但为了兼容现有代码,我们仍然提供这个函数
 */
export async function checkImageStatus(
  requestId: string
): Promise<any> {
  // 由于是同步返回,这个函数可能不会被调用
  // 或者可以直接返回已完成状态
  throw new Error('BytePlus Image API returns results synchronously')
}
```

---

### 3.4 更新路由层

**重要**: BytePlus Image API 是**同步返回**的,需要重构路由逻辑!

**文件**: `app/api/image/generate-text-to-image/route.ts`

```typescript
import { submitImageGeneration } from '@/lib/services/byteplus/image/seedream-api'

// 主要变化:
// 1. 调用 submitImageGeneration 会直接返回图片 URL
// 2. 不需要返回 requestId 让前端轮询
// 3. 直接返回最终结果

export async function POST(request: NextRequest) {
  // ... 认证和参数验证 ...

  // 调用 BytePlus API (同步返回)
  const result = await submitImageGeneration(body)

  // ⚠️ 这里需要直接保存图片到 Supabase
  // 因为 BytePlus 返回的 URL 只有 24 小时有效期!

  return NextResponse.json({
    success: true,
    data: {
      imageUrl: result.data.url,  // 直接返回图片
      // 不需要 requestId
    }
  })
}
```

---

### 3.5 测试 Image API

**测试清单**:

1. **Text-to-Image 测试**:
   ```bash
   curl -X POST http://localhost:3000/api/image/generate-text-to-image \
     -H "Cookie: your-session-cookie" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "A beautiful sunset",
       "model": "seedream-v4",
       "aspectRatio": "16:9"
     }'
   ```

2. **Image-to-Image 测试**:
   ```bash
   curl -X POST http://localhost:3000/api/image/generate-image-to-image \
     -H "Cookie: your-session-cookie" \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "Make it more colorful",
       "images": ["https://your-image-url.jpg"],
       "model": "seedream-v4",
       "aspectRatio": "16:9"
     }'
   ```

---

## 💰 阶段 4: 积分系统适配 (1天)

### 4.1 更新积分计算

**文件**: `lib/credits-calculator.ts`

**需要调整的地方**:
- BytePlus 使用 token 计费,不是固定积分
- 需要根据 BytePlus 的计费文档重新计算

**参考价格** (需要查询 BytePlus 官网确认):
```typescript
const BYTEPLUS_PRICING = {
  video: {
    proFast: {
      // 根据 resolution 和 duration 计算
    },
    pro: {
      // 更贵
    }
  },
  image: {
    seedream4: {
      // 按生成的图片数量和分辨率计算
    }
  }
}
```

---

## 🧪 阶段 5: 测试与部署 (2-3天)

### 5.1 本地测试清单

**Video 功能**:
- [ ] Text-to-Video (480p, 720p, 1080p)
- [ ] Image-to-Video (首帧)
- [ ] Image-to-Video (首尾帧) - 如果支持
- [ ] Video Effects
- [ ] 状态轮询
- [ ] 积分扣除
- [ ] 积分退还(失败时)
- [ ] 错误处理

**Image 功能**:
- [ ] Text-to-Image (各种 aspect ratio)
- [ ] Image-to-Image (单张)
- [ ] Image-to-Image (多张)
- [ ] 积分扣除
- [ ] 图片保存到 Supabase (24小时过期!)
- [ ] 错误处理

---

### 5.2 灰度发布策略

**方案 1: 环境变量控制**

```typescript
// 在路由层添加开关
const USE_BYTEPLUS = process.env.USE_BYTEPLUS === 'true'

if (USE_BYTEPLUS) {
  return await byteplusVideoAPI.submitGeneration(request)
} else {
  return await wavespeedVideoAPI.submitGeneration(request)
}
```

**方案 2: 用户分组**

```typescript
// 根据用户 ID 或邮箱决定使用哪个 API
const isTestUser = BETA_USERS.includes(session.user.email)

if (isTestUser) {
  return await byteplusVideoAPI.submitGeneration(request)
} else {
  return await wavespeedVideoAPI.submitGeneration(request)
}
```

---

### 5.3 监控和告警

**需要监控的指标**:
1. API 调用成功率
2. 平均响应时间
3. 错误率(按错误码分组)
4. 积分消耗情况
5. 24小时内未保存的资源数量

**日志格式**:
```typescript
console.log('[BytePlus Video]', {
  action: 'submit_task',
  taskId: 'xxx',
  model: 'seedance-1-0-pro-fast',
  duration: 5,
  resolution: '720p',
  userId: 'xxx',
  success: true,
  latency: 1234
})
```

---

## 🚨 重要注意事项

### ⚠️ 24小时 URL 过期问题

**BytePlus 返回的视频/图片 URL 只有 24 小时有效期!**

**解决方案**:
1. 收到 URL 后**立即下载**并上传到 Supabase Storage
2. 在数据库中保存 Supabase URL,而不是 BytePlus URL
3. 添加定时任务,检查并清理未保存的资源

**代码示例**:
```typescript
// 下载 BytePlus 视频
const videoBlob = await fetch(byteplusVideoUrl).then(r => r.blob())

// 上传到 Supabase
const { data, error } = await supabase.storage
  .from('videos')
  .upload(`${userId}/${videoId}.mp4`, videoBlob)

// 保存 Supabase URL 到数据库
await supabase
  .from('videos')
  .update({ video_url: data.publicUrl })
  .eq('id', videoId)
```

---

### ⚠️ 参数验证

**确保前端传入的参数符合 BytePlus 要求**:

| 参数 | BytePlus 限制 | 现有代码 | 需要调整? |
|------|--------------|----------|-----------|
| **duration** | 2-12秒 | 5或10秒 | ✅ 兼容 |
| **resolution** | 480p/720p/1080p | 同样 | ✅ 兼容 |
| **aspectRatio** | 9种选项 | 需检查 | ⚠️ 可能需要调整 |
| **seed** | -1 或 [0, 2^32-1] | 同样 | ✅ 兼容 |

---

## 📋 执行检查清单

### 阶段 1: 基础设施
- [ ] 创建 `lib/services/byteplus/core/client.ts`
- [ ] 创建 `lib/services/byteplus/core/errors.ts`
- [ ] 创建 `lib/services/byteplus/core/retry.ts`
- [ ] 测试 HTTP 客户端基本功能

### 阶段 2: Video API
- [ ] 创建 `lib/services/byteplus/video/types.ts`
- [ ] 创建 `lib/services/byteplus/video/utils.ts`
- [ ] 实现 `buildPromptWithCommands()` 函数
- [ ] 创建 `lib/services/byteplus/video/seedance-api.ts`
- [ ] 更新 `app/api/video/generate/route.ts`
- [ ] 更新 `app/api/video/generate-image-to-video/route.ts`
- [ ] 更新 `app/api/video/status/[requestId]/route.ts`
- [ ] 测试 Text-to-Video
- [ ] 测试 Image-to-Video
- [ ] 测试状态查询
- [ ] 测试积分系统

### 阶段 3: Image API
- [ ] 创建 `lib/services/byteplus/image/types.ts`
- [ ] 创建 `lib/services/byteplus/image/utils.ts`
- [ ] 创建 `lib/services/byteplus/image/seedream-api.ts`
- [ ] 重构 Image 路由(同步返回)
- [ ] 实现图片自动保存到 Supabase
- [ ] 测试 Text-to-Image
- [ ] 测试 Image-to-Image
- [ ] 测试积分系统

### 阶段 4: 积分适配
- [ ] 查询 BytePlus 计费价格
- [ ] 更新 `lib/credits-calculator.ts`
- [ ] 测试积分计算准确性

### 阶段 5: 测试部署
- [ ] 完整功能测试
- [ ] 配置灰度发布开关
- [ ] 小流量测试
- [ ] 监控指标检查
- [ ] 全量上线
- [ ] 删除旧代码

---

## 🔗 相关资源

### 文档链接
- BytePlus 控制台: https://console.byteplus.com/ark
- API Key 管理: https://console.byteplus.com/ark/region:ark+ap-southeast-1/apiKey
- API 浏览器: https://api.byteplus.com/api-explorer
- 官方文档: https://docs.byteplus.com/en/docs/ModelArk

### 内部文档
- 调研报告: `discuss/byteplus-api-migration-research.md`
- 现有代码:
  - `lib/services/wavespeed-api.ts`
  - `lib/services/wavespeed-image-api.ts`
  - `lib/types/video.ts`
  - `lib/types/image.ts`

---

## 💬 常见问题

### Q1: 为什么 Video API 要用文本命令格式?
**A**: 这是 BytePlus Seedance API 的设计,所有控制参数都嵌入到 prompt 中,例如 `--resolution 1080p --duration 5`

### Q2: Image API 是同步还是异步?
**A**: BytePlus Seedream 4.0 是**同步返回**的,调用 API 后直接返回图片 URL,无需轮询

### Q3: 24小时 URL 过期怎么办?
**A**: 必须在收到 URL 后**立即下载并保存到 Supabase Storage**,然后在数据库中保存 Supabase URL

### Q4: Pro 和 Pro-Fast 有什么区别?
**A**: Pro-Fast 速度快3倍,价格低72%,质量略低。建议默认使用 Pro-Fast

### Q5: 如何测试 BytePlus API?
**A**:
1. 本地启动项目
2. 使用 curl 或 Postman 调用 API
3. 检查 console.log 输出
4. 验证返回的 requestId 和状态

### Q6: 迁移后如何回滚?
**A**: 保留 WaveSpeed API 代码,通过环境变量 `USE_BYTEPLUS` 控制使用哪个 API

---

## 📞 支持联系

- **技术问题**: 查看 `discuss/byteplus-api-migration-research.md`
- **API 问题**: https://console.byteplus.com/workorder/create
- **文档反馈**: 提交 Issue 到项目 discuss 目录

---

**文档版本**: v1.0
**创建时间**: 2025-11-27
**最后更新**: 2025-11-27
**负责人**: 开发团队
