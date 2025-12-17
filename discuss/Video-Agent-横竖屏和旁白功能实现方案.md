# Video Agent - 横竖屏和旁白功能实现方案

## 功能概述

新增两个全局配置选项，影响整个 Video Agent 工作流：

1. **Aspect Ratio（横竖屏）**: 16:9（横屏）或 9:16（竖屏）
   - 影响：人物图、分镜图、视频的尺寸比例
   - 用户选择后，全流程保持一致的尺寸比例

2. **Enable Narration（开启旁白）**: 是否启用画外音旁白
   - 影响：Step 5 视频生成时使用的 API
   - 开启时：使用 veo 3 API，并在 prompt 中添加旁白描述

---

## 一、UI 设计

### 位置：InputStage.tsx（脚本输入界面）

在 Story Style 和 Video Script 之间新增一个配置面板：

```
┌─────────────────────────────────────────────────────┐
│ Aspect Ratio & Options                              │
│                                                      │
│ ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │
│ │  ○ 16:9      │  │  ○ 9:16      │  │ □ Enable   │ │
│ │  Landscape   │  │  Portrait    │  │ Narration  │ │
│ └──────────────┘  └──────────────┘  └────────────┘ │
└─────────────────────────────────────────────────────┘
```

### 布局细节
- 使用 3 列网格（grid-cols-3）
- 左：16:9 单选按钮
- 中：9:16 单选按钮
- 右：Enable Narration 复选框
- 样式与 Duration/Story Style 保持一致

### 代码结构
```tsx
const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
const [enableNarration, setEnableNarration] = useState(false)

// 提交时传递
await onStart({
  duration,
  storyStyle,
  originalScript: script,
  aspectRatio,      // 新增
  enableNarration   // 新增
})
```

---

## 二、数据库变更

### 表：video_agent_projects

新增两个字段：

```sql
ALTER TABLE video_agent_projects
ADD COLUMN aspect_ratio VARCHAR(10) DEFAULT '16:9',
ADD COLUMN enable_narration BOOLEAN DEFAULT false;
```

**迁移文件：** `lib/database/migrations/add-aspect-ratio-narration.sql`

---

## 三、核心逻辑：各步骤如何使用

### Step 1: Script Analysis
- 不受影响，照常分析脚本

### Step 2: Character Configuration
```typescript
// 人物图生成时使用全局 aspect_ratio
const result = await submitImageGeneration({
  prompt: character.prompt,
  negativePrompt: character.negativePrompt,
  aspectRatio: project.aspect_ratio  // '16:9' 或 '9:16'
})
```

**批量生成 API 调整：**
- `app/api/video-agent/projects/[id]/batch-generate-characters/route.ts`
- 传递 `aspectRatio: project.aspect_ratio`

### Step 3: Storyboard Image Generation
```typescript
// 分镜图生成时使用全局 aspect_ratio
const result = await submitImageGeneration({
  prompt: shot.description,
  aspectRatio: project.aspect_ratio  // '16:9' 或 '9:16'
})
```

**API 调整：**
- `app/api/video-agent/projects/[id]/generate-shot-images/route.ts`

### Step 4: Music Generation
- 不受影响，照常生成音乐

### Step 5: Shot Video Generation

**核心判断逻辑：**

```typescript
if (project.enable_narration) {
  // 使用 veo 3 API
  const referenceImages = selectReferenceImages(shot, project)

  const taskId = await generateVeo3Video({
    prompt: shot.description,
    aspectRatio: project.aspect_ratio,
    enableNarration: true,
    referenceImages
  })

  // 保存 taskId，异步轮询获取结果
} else {
  // 使用现有的视频生成服务（runway/kling/其他）
}
```

---

## 四、Wavespeed veo3.1-fast API 集成

### 环境变量

`.env.local`:
```env
WAVESPEED_API_KEY=your_wavespeed_api_key_here
```

**注意：** 项目中已配置 WAVESPEED_API_KEY，无需额外配置。

### 新建服务文件

**文件：** `lib/services/video-agent/veo3-video-generator.ts`

```typescript
/**
 * Veo 3.1 视频生成服务（基于 Wavespeed API）
 * 使用 Google Veo 3.1 Fast Image-to-Video 模型生成带旁白的视频
 */

const WAVESPEED_BASE_URL = 'https://api.wavespeed.ai/api/v3'
const WAVESPEED_API_KEY = process.env.WAVESPEED_API_KEY || ''

if (!WAVESPEED_API_KEY) {
  console.error('⚠️ WAVESPEED_API_KEY is not configured')
}

// Veo 3.1 仅支持 4/6/8 秒时长
const VEO3_DURATION_MAP: Record<number, number> = {
  3: 4,   // 3秒 → 4秒
  4: 4,   // 4秒 → 4秒
  5: 6,   // 5秒 → 6秒
  6: 6,   // 6秒 → 6秒
  7: 6,   // 7秒 → 6秒
  8: 8,   // 8秒 → 8秒
  9: 8,   // 9秒 → 8秒
  10: 8   // 10秒 → 8秒
}

interface Veo3VideoRequest {
  prompt: string
  image: string  // 分镜图 URL（必需）
  aspectRatio: '16:9' | '9:16'
  duration: number  // 原始时长（秒）
  lastImage?: string  // 可选：结束帧图片，用于连续镜头过渡
  negativePrompt?: string  // 可选：负向提示词
}

interface Veo3VideoResponse {
  requestId: string  // Wavespeed prediction ID
}

/**
 * 映射 Video Agent duration 到 veo3.1 支持的时长
 */
function mapDurationToVeo3(duration: number): number {
  const mapped = VEO3_DURATION_MAP[duration]
  if (!mapped) {
    console.warn(`[Veo3] Unsupported duration ${duration}s, defaulting to 6s`)
    return 6
  }
  return mapped
}

/**
 * 生成 veo 3.1 视频
 */
export async function generateVeo3Video(
  request: Veo3VideoRequest
): Promise<Veo3VideoResponse> {
  console.log('[Veo3] Starting video generation:', {
    aspectRatio: request.aspectRatio,
    originalDuration: request.duration,
    hasLastImage: !!request.lastImage
  })

  // 1. 映射 duration 到 veo3.1 支持的值
  const veo3Duration = mapDurationToVeo3(request.duration)
  console.log(`[Veo3] Duration mapped: ${request.duration}s → ${veo3Duration}s`)

  // 2. 增强 prompt（添加旁白描述）
  const enhancedPrompt = `${request.prompt}, with clear voiceover narration in storytelling style`

  // 3. 构建请求体（参考 wavespeed veo3.1-fast API）
  const apiRequest: any = {
    prompt: enhancedPrompt,
    image: request.image,  // 必需：分镜图
    aspect_ratio: request.aspectRatio,
    duration: veo3Duration,  // 4/6/8
    resolution: '720p',  // 默认 720p
    generate_audio: true  // 生成旁白音频
  }

  // 4. 可选参数
  if (request.lastImage) {
    apiRequest.last_image = request.lastImage  // 结束帧，用于连续镜头
  }

  if (request.negativePrompt) {
    apiRequest.negative_prompt = request.negativePrompt
  }

  console.log('[Veo3] API request:', {
    endpoint: '/google/veo3.1-fast/image-to-video',
    duration: apiRequest.duration,
    hasLastImage: !!apiRequest.last_image
  })

  // 5. 调用 Wavespeed API
  const response = await fetch(
    `${WAVESPEED_BASE_URL}/google/veo3.1-fast/image-to-video`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`
      },
      body: JSON.stringify(apiRequest)
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[Veo3] API error:', {
      status: response.status,
      error: errorText
    })
    throw new Error(`Veo3 API error: ${response.status} - ${errorText}`)
  }

  const result = await response.json()

  // Wavespeed 响应格式：{ id, status, urls, ... }
  if (!result.id) {
    throw new Error('Invalid Veo3 API response: missing prediction ID')
  }

  console.log('[Veo3] Task created:', result.id)

  return {
    requestId: result.id
  }
}

/**
 * 查询 veo 3.1 视频生成状态
 * 复用现有的 Wavespeed 状态查询机制
 */
export async function getVeo3VideoStatus(requestId: string) {
  const response = await fetch(
    `${WAVESPEED_BASE_URL}/predictions/${requestId}/result`,
    {
      headers: {
        'Authorization': `Bearer ${WAVESPEED_API_KEY}`
      }
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to get task status: ${response.status}`)
  }

  const result = await response.json()

  // Wavespeed 状态格式：
  // { data: { status: 'queued'|'processing'|'completed'|'failed', outputs: [...] } }

  if (result.data.status === 'completed' && result.data.outputs?.length > 0) {
    return {
      status: 'completed' as const,
      videoUrl: result.data.outputs[0],
      error: null
    }
  } else if (result.data.status === 'failed') {
    return {
      status: 'failed' as const,
      videoUrl: null,
      error: result.data.error || 'Generation failed'
    }
  } else {
    return {
      status: 'processing' as const,
      videoUrl: null,
      error: null
    }
  }
}
```

### 参考图策略（简化版）

veo3.1-fast image-to-video API 支持：
- **image**（必需）：主要输入图片（分镜图）
- **last_image**（可选）：结束帧图片，用于连续镜头的平滑过渡

**实现策略：**

```typescript
/**
 * 获取视频生成的参考图
 */
function getVideoGenerationImages(
  shot: any,
  nextShot?: any
): { image: string; lastImage?: string } {
  const result: { image: string; lastImage?: string } = {
    image: shot.imageUrl  // 当前分镜图作为开始帧
  }

  // 如果有下一个分镜，使用其图片作为结束帧（实现连续过渡）
  if (nextShot && nextShot.imageUrl) {
    result.lastImage = nextShot.imageUrl
  }

  return result
}
```

**注意：**
- 不再使用人物参考图（veo3.1 是 image-to-video，分镜图已包含人物信息）
- 支持首尾帧过渡，让连续镜头更流畅

---

## 五、API 路由修改清单

### 1. 创建项目 API
**文件：** `app/api/video-agent/projects/route.ts`

```typescript
// 保存新参数
const { data: project, error } = await supabaseAdmin
  .from('video_agent_projects')
  .insert({
    user_id: session.user.email,
    duration,
    story_style: storyStyle,
    original_script: originalScript,
    aspect_ratio: aspectRatio,      // 新增
    enable_narration: enableNarration, // 新增
    status: 'analyzing'
  })
```

### 2. 批量生成人物图 API
**文件：** `app/api/video-agent/projects/[id]/batch-generate-characters/route.ts`

```typescript
const request: ImageGenerationRequest = {
  prompt: charPrompt.prompt,
  negativePrompt: charPrompt.negativePrompt,
  aspectRatio: project.aspect_ratio,  // 使用项目设置
  watermark: false
}
```

### 3. 生成分镜图 API
**文件：** `app/api/video-agent/projects/[id]/generate-shot-images/route.ts`

```typescript
const result = await submitImageGeneration({
  prompt: shot.description,
  negativePrompt: negativePrompt,
  aspectRatio: project.aspect_ratio,  // 使用项目设置
  watermark: false
})
```

### 4. 生成分镜视频 API（核心修改）
**文件：** `app/api/video-agent/projects/[id]/generate-shot-video/route.ts`

```typescript
// 判断是否使用 veo 3.1
if (project.enable_narration) {
  // 使用 veo 3.1 image-to-video

  // 获取参考图（分镜图 + 可选的下一个分镜图）
  const images = getVideoGenerationImages(shot, nextShot)

  const { requestId } = await generateVeo3Video({
    prompt: shot.description,
    image: images.image,
    aspectRatio: project.aspect_ratio,
    duration: shot.duration || 5,  // 使用 shot 的 duration
    lastImage: images.lastImage,
    negativePrompt: undefined  // 可选
  })

  // 保存 requestId 到数据库
  await supabaseAdmin
    .from('video_agent_shots')
    .update({
      video_request_id: requestId,
      video_status: 'generating'
    })
    .eq('id', shotId)

  return NextResponse.json({
    success: true,
    data: { requestId, status: 'generating' }
  })
} else {
  // 使用现有的视频生成服务
  // ... 现有逻辑
}
```

### 5. 查询 veo 3.1 视频状态 API（可选 - 复用现有机制）

**方案 A：复用现有 Wavespeed 状态查询**

项目已有 `checkVideoStatus(requestId)` 函数（在 `lib/services/wavespeed-api.ts`），可直接复用：

```typescript
// 在前端轮询中使用现有机制
const status = await checkVideoStatus(requestId)
```

**方案 B：创建独立的 veo3 状态查询 API**

如果需要额外的业务逻辑，可创建：

**文件：** `app/api/video-agent/projects/[id]/veo3-video-status/route.ts`

```typescript
/**
 * GET /api/video-agent/projects/[id]/veo3-video-status?requestId=xxx
 * 查询 veo 3.1 视频生成状态
 */
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { getVeo3VideoStatus } from '@/lib/services/video-agent/veo3-video-generator'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: projectId } = await params
    const { searchParams } = new URL(request.url)
    const requestId = searchParams.get('requestId')

    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 })
    }

    // 查询任务状态（调用 wavespeed API）
    const result = await getVeo3VideoStatus(requestId)

    // 如果完成，更新数据库
    if (result.status === 'completed' && result.videoUrl) {
      await supabaseAdmin
        .from('video_agent_shots')
        .update({
          video_url: result.videoUrl,
          video_status: 'completed'
        })
        .eq('video_request_id', requestId)
    } else if (result.status === 'failed') {
      await supabaseAdmin
        .from('video_agent_shots')
        .update({
          video_status: 'failed',
          video_error: result.error
        })
        .eq('video_request_id', requestId)
    }

    return NextResponse.json({
      success: true,
      data: result
    })

  } catch (error: any) {
    console.error('[API] Veo3 status check failed:', error)
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    )
  }
}
```

**推荐：** 使用方案 A（复用现有机制），减少代码重复。

---

## 六、前端组件修改清单

### 1. InputStage.tsx（主要修改）

**新增状态：**
```tsx
const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9')
const [enableNarration, setEnableNarration] = useState(false)
```

**新增 UI（在 Story Style 和 Video Script 之间）：**
```tsx
{/* Aspect Ratio & Options */}
<div>
  <Label className="text-base font-semibold">Aspect Ratio & Options</Label>
  <div className="grid grid-cols-3 gap-3 mt-3">
    {/* 16:9 选项 */}
    <button
      onClick={() => setAspectRatio('16:9')}
      className={`
        p-4 rounded-lg border-2 transition-all text-left
        ${
          aspectRatio === '16:9'
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }
      `}
    >
      <div className="font-semibold">16:9</div>
      <div className="text-xs text-muted-foreground mt-1">Landscape</div>
    </button>

    {/* 9:16 选项 */}
    <button
      onClick={() => setAspectRatio('9:16')}
      className={`
        p-4 rounded-lg border-2 transition-all text-left
        ${
          aspectRatio === '9:16'
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }
      `}
    >
      <div className="font-semibold">9:16</div>
      <div className="text-xs text-muted-foreground mt-1">Portrait</div>
    </button>

    {/* Enable Narration 复选框 */}
    <button
      onClick={() => setEnableNarration(!enableNarration)}
      className={`
        p-4 rounded-lg border-2 transition-all text-left
        ${
          enableNarration
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary/50'
        }
      `}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={enableNarration}
          onChange={() => {}}
          className="w-4 h-4"
        />
        <span className="font-semibold">Enable Narration</span>
      </div>
      <div className="text-xs text-muted-foreground mt-1">
        AI voiceover
      </div>
    </button>
  </div>
</div>
```

**提交时传递参数：**
```tsx
await onStart({
  duration,
  storyStyle,
  originalScript: script,
  aspectRatio,
  enableNarration
})
```

### 2. Step2CharacterConfig.tsx

无需修改 - 批量生成 API 已经使用 `project.aspect_ratio`

### 3. Step3StoryboardReview.tsx

无需修改 - 生成分镜图 API 已经使用 `project.aspect_ratio`

### 4. Step5VideoGeneration.tsx

**显示提示信息：**
```tsx
{project.enable_narration && (
  <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg text-sm">
    <div className="flex items-start gap-2">
      <Volume2 className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-400" />
      <div>
        <div className="font-semibold text-purple-400">Narration Enabled</div>
        <div className="text-muted-foreground mt-1">
          Videos will be generated with voiceover narration using Veo 3.1 AI
        </div>
      </div>
    </div>
  </div>
)}
```

**轮询 veo 3 状态（如果使用 veo 3）：**
```tsx
// 轮询函数
const pollVeo3Status = async (taskId: string) => {
  const maxAttempts = 60  // 最多轮询 5 分钟（每 5 秒一次）
  let attempts = 0

  const poll = async (): Promise<void> => {
    if (attempts >= maxAttempts) {
      throw new Error('Video generation timeout')
    }

    const response = await fetch(
      `/api/video-agent/projects/${project.id}/veo3-video-status?taskId=${taskId}`
    )
    const { data } = await response.json()

    if (data.status === 'completed') {
      // 刷新项目数据
      return
    } else if (data.status === 'failed') {
      throw new Error(data.error || 'Generation failed')
    } else {
      // 继续轮询
      attempts++
      await new Promise(resolve => setTimeout(resolve, 5000))
      return poll()
    }
  }

  return poll()
}
```

---

## 七、数据库字段变更

### video_agent_shots 表

新增字段存储视频生成任务信息：

```sql
ALTER TABLE video_agent_shots
ADD COLUMN video_request_id VARCHAR(255),  -- Wavespeed prediction ID
ADD COLUMN video_status VARCHAR(50) DEFAULT 'pending',  -- pending/generating/completed/failed
ADD COLUMN video_error TEXT;  -- 错误信息

-- 如果已有 video_task_id 字段，可以重命名或删除
-- ALTER TABLE video_agent_shots RENAME COLUMN video_task_id TO video_request_id;
```

---

## 八、实施步骤

### Phase 1: 数据库和基础设施
1. ✅ 运行数据库迁移（添加 aspect_ratio, enable_narration 等字段）
2. ✅ 确认 WAVESPEED_API_KEY 环境变量已配置
3. ✅ 创建 veo3-video-generator.ts 服务

### Phase 2: 前端 UI
4. ✅ 修改 InputStage.tsx（添加 Aspect Ratio 和 Enable Narration 选项）
5. ✅ 测试选项交互和状态传递

### Phase 3: API 集成
6. ✅ 修改创建项目 API（保存新参数）
7. ✅ 修改批量生成人物图 API（使用 aspect_ratio）
8. ✅ 修改生成分镜图 API（使用 aspect_ratio）
9. ✅ 修改生成分镜视频 API（集成 veo3.1-fast）
10. ✅ 可选：创建独立的 veo3 状态查询 API（或复用现有）

### Phase 4: 前端视频生成逻辑
11. ✅ 修改 Step5VideoGeneration.tsx（显示旁白提示、轮询状态）

### Phase 5: 测试
12. ✅ 测试 16:9 + 旁白（veo3.1-fast image-to-video）
13. ✅ 测试 9:16 + 旁白（veo3.1-fast image-to-video）
14. ✅ 测试 16:9 + 无旁白（现有服务）
15. ✅ 测试 9:16 + 无旁白（现有服务）
16. ✅ 测试 Duration 映射（5秒→6秒等）

---

## 九、Wavespeed veo3.1-fast API 特性总结

### API 参数

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| `prompt` | string | ✅ | 视频生成提示词 |
| `image` | string | ✅ | 输入图片 URL（分镜图） |
| `aspect_ratio` | string | ❌ | 16:9 或 9:16（默认 16:9） |
| `duration` | integer | ❌ | 4/6/8 秒（默认 8） |
| `resolution` | string | ❌ | 720p 或 1080p（默认 1080p） |
| `generate_audio` | boolean | ❌ | 是否生成音频（默认 true） |
| `last_image` | string | ❌ | 结束帧图片（用于连续过渡） |
| `negative_prompt` | string | ❌ | 负向提示词 |

### 我们的使用策略

- **开启旁白**: 使用 veo3.1-fast image-to-video，`generate_audio: true`
- **不开启旁白**: 使用现有视频生成服务（bytedance/其他）
- **横竖屏**: 通过 `aspect_ratio` 参数控制（16:9 或 9:16）
- **连续镜头**: 使用 `last_image` 传递下一个分镜图，实现平滑过渡

### Duration 映射逻辑

```typescript
// Video Agent shot duration → veo3.1 duration
3秒 → 4秒
4秒 → 4秒
5秒 → 6秒  // 最常见
6秒 → 6秒
7秒 → 6秒
8秒 → 8秒
9秒 → 8秒
10秒 → 8秒
```

### 旁白 Prompt 增强

```typescript
// 原始 prompt
"A knight riding a horse through a forest"

// 增强后（开启旁白）
"A knight riding a horse through a forest, with clear voiceover narration in storytelling style"
```

---

## 十、注意事项

### 1. 成本考虑
- veo 3.1 API（Wavespeed）有独立的计费体系
- 建议在项目设置中显示"启用旁白可能产生额外费用"

### 2. 生成时长
- veo 3.1 视频生成可能需要 2-5 分钟（取决于队列）
- 需要轮询机制查询状态（建议间隔 5-10 秒）
- 建议设置超时时间（10 分钟）

### 3. Duration 映射（重要！）
- **veo 3.1 仅支持 4/6/8 秒**
- Video Agent 的 shot duration 需要映射（5秒→6秒，10秒→8秒）
- 映射逻辑已在 `VEO3_DURATION_MAP` 中定义

### 4. 错误处理
- veo 3.1 可能因内容审核失败（NSFW 检测）
- 需要捕获错误并向用户展示
- 可考虑降级方案（自动切换到其他视频服务）

### 5. 参考图质量
- 确保分镜图 URL 可访问（必需）
- 建议使用 CDN 加速（Supabase Storage）
- 图片格式：JPEG, PNG, WebP
- 图片尺寸：建议 ≤ 10MB

### 6. API 限制
- Wavespeed API 有速率限制
- 建议添加重试机制（项目已有 `retryWithBackoff`）
- 使用现有的 `wavespeed-api.ts` 错误处理模式

---

## 十一、测试用例

### 测试场景 1: 16:9 横屏 + 开启旁白
- 创建项目，选择 16:9 + Enable Narration
- 生成人物图：应为 16:9 横图
- 生成分镜图：应为 16:9 横图
- 生成视频：使用 veo3.1-fast，分镜图作为 `image`
- 验证视频有旁白音频效果

### 测试场景 2: 9:16 竖屏 + 开启旁白
- 创建项目，选择 9:16 + Enable Narration
- 生成人物图：应为 9:16 竖图
- 生成分镜图：应为 9:16 竖图
- 生成视频：使用 veo3.1-fast，aspect_ratio = "9:16"
- 验证视频有旁白音频效果

### 测试场景 3: 16:9 横屏 + 不开启旁白
- 创建项目，选择 16:9，不勾选 Enable Narration
- 全流程应使用现有服务（bytedance/其他）
- 验证视频无旁白

### 测试场景 4: 9:16 竖屏 + 不开启旁白
- 创建项目，选择 9:16，不勾选 Enable Narration
- 全流程应使用现有服务
- 验证视频无旁白

### 测试场景 5: Duration 映射验证
- 创建包含不同时长 shot 的项目（5秒、8秒、10秒）
- 开启旁白
- 验证 API 调用：5秒→6秒，8秒→8秒，10秒→8秒

---

## 十二、文件清单

### 新建文件
- `lib/services/video-agent/veo3-video-generator.ts`
- `lib/database/migrations/add-aspect-ratio-narration.sql`
- `app/api/video-agent/projects/[id]/veo3-video-status/route.ts`

### 修改文件
- `app/studio/video-agent-beta/components/InputStage.tsx`
- `app/studio/video-agent-beta/components/steps/Step5VideoGeneration.tsx`
- `app/api/video-agent/projects/route.ts`
- `app/api/video-agent/projects/[id]/batch-generate-characters/route.ts`
- `app/api/video-agent/projects/[id]/generate-shot-images/route.ts`
- `app/api/video-agent/projects/[id]/generate-shot-video/route.ts`

---

## 执行完成标准

- ✅ 用户可在创建项目时选择 16:9/9:16 和是否开启旁白
- ✅ 人物图、分镜图、视频尺寸比例保持一致
- ✅ 开启旁白时，视频通过 wavespeed veo3.1-fast 生成，包含画外音效果
- ✅ Duration 正确映射到 4/6/8 秒
- ✅ 支持首尾帧过渡（连续镜头更流畅）
- ✅ 所有 API 调用成功，错误处理完善
- ✅ UI 提示清晰，用户体验流畅

---

## 附录：Wavespeed API 示例

### veo3.1-fast 请求示例（16:9 横屏）
```json
{
  "prompt": "A knight riding a horse through a forest, with clear voiceover narration in storytelling style",
  "image": "https://cdn.example.com/storyboard-shot-1.jpg",
  "aspect_ratio": "16:9",
  "duration": 6,
  "resolution": "720p",
  "generate_audio": true
}
```

### veo3.1-fast 请求示例（9:16 竖屏）
```json
{
  "prompt": "A knight riding a horse through a forest, with clear voiceover narration in storytelling style",
  "image": "https://cdn.example.com/storyboard-shot-1.jpg",
  "aspect_ratio": "9:16",
  "duration": 6,
  "resolution": "720p",
  "generate_audio": true
}
```

### veo3.1-fast 请求示例（带结束帧，连续镜头过渡）
```json
{
  "prompt": "A knight riding a horse through a forest, with clear voiceover narration in storytelling style",
  "image": "https://cdn.example.com/storyboard-shot-1.jpg",
  "last_image": "https://cdn.example.com/storyboard-shot-2.jpg",
  "aspect_ratio": "16:9",
  "duration": 8,
  "resolution": "720p",
  "generate_audio": true
}
```

### Wavespeed 响应示例
```json
{
  "id": "pred_abcdef123456",
  "status": "created",
  "model": "google/veo3.1-fast/image-to-video",
  "created_at": "2025-12-15T12:00:00.000Z",
  "urls": {
    "get": "https://api.wavespeed.ai/api/v3/predictions/pred_abcdef123456/result"
  }
}
```

### 状态查询响应示例（处理中）
```json
{
  "data": {
    "id": "pred_abcdef123456",
    "status": "processing",
    "progress": 50,
    "outputs": [],
    "created_at": "2025-12-15T12:00:00.000Z"
  }
}
```

### 状态查询响应示例（完成）
```json
{
  "data": {
    "id": "pred_abcdef123456",
    "status": "completed",
    "outputs": [
      "https://cdn.wavespeed.ai/outputs/pred_abcdef123456/video.mp4"
    ],
    "has_nsfw_contents": [false],
    "created_at": "2025-12-15T12:00:00.000Z"
  }
}
```

---

**文档版本：** v2.0 (Wavespeed veo3.1-fast)
**创建日期：** 2025-12-15
**更新日期：** 2025-12-15
**适用项目：** Video Agent Beta
**API 提供商：** Wavespeed (veo3.1-fast image-to-video)
