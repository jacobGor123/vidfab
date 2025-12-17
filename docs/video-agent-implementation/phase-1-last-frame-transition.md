# Phase 1: 首尾帧链式过渡实施

## 目标

实现 BytePlus API 的 `return_last_frame` 特性，使每个视频片段的末尾帧作为下一个片段的首帧，实现无缝衔接。

**优先级：** 🔥 P0（最高优先级，核心功能）
**预估时间：** 4-6 小时

---

## 工作原理

### 传统方式（改进前）
```
分镜图 1 → 视频片段 1
分镜图 2 → 视频片段 2  ❌ 与片段 1 无关联，可能跳跃
分镜图 3 → 视频片段 3  ❌ 与片段 2 无关联，可能跳跃
```

### 链式过渡（改进后）
```
分镜图 1 → 视频片段 1 → 末尾帧 A
末尾帧 A → 视频片段 2 → 末尾帧 B  ✅ 从片段 1 的末尾开始
末尾帧 B → 视频片段 3 → 末尾帧 C  ✅ 从片段 2 的末尾开始
```

**效果：** 每个片段的开头与上一个片段的结尾完美衔接，角色位置、动作、场景连贯一致。

---

## 实施步骤

### Step 1: 数据库迁移

#### 1.1 创建迁移文件

**文件：** `lib/database/migrations/add-last-frame-and-audio.sql`

```sql
-- 添加 last_frame_url 字段到 project_video_clips 表
ALTER TABLE project_video_clips
ADD COLUMN IF NOT EXISTS last_frame_url TEXT;

COMMENT ON COLUMN project_video_clips.last_frame_url IS '视频末尾帧 URL（用于下一个片段的首帧）';

-- 添加索引（可选，用于查询优化）
CREATE INDEX IF NOT EXISTS idx_project_video_clips_last_frame
ON project_video_clips(project_id, shot_number)
WHERE last_frame_url IS NOT NULL;
```

#### 1.2 执行迁移

```bash
# 连接到 Supabase 数据库执行迁移
# 方式 1: 通过 Supabase Dashboard SQL Editor 执行上述 SQL

# 方式 2: 通过本地脚本执行
cd /Users/jacob/Desktop/vidfab
node scripts/dev/execute-migration.js lib/database/migrations/add-last-frame-and-audio.sql
```

#### 1.3 验证迁移

```sql
-- 验证字段已添加
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'project_video_clips'
  AND column_name = 'last_frame_url';

-- 预期结果：
-- column_name     | data_type | column_default
-- last_frame_url  | text      | NULL
```

---

### Step 2: 修改 BytePlus API 类型定义

#### 2.1 更新视频状态响应类型

**文件：** `lib/types/video.ts`

**查找：**
```typescript
export interface VideoStatusResponse {
  data: {
    id: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    outputs?: string[]
    error?: string
    progress?: number
    created_at?: string
    updated_at?: string
  }
}
```

**替换为：**
```typescript
export interface VideoStatusResponse {
  data: {
    id: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    outputs?: string[]  // video_url
    lastFrameUrl?: string  // 🔥 新增：末尾帧 URL
    error?: string
    progress?: number
    created_at?: string
    updated_at?: string
  }
}
```

#### 2.2 验证 BytePlus 类型（已有，确认即可）

**文件：** `lib/services/byteplus/video/types.ts`

**确认以下类型定义存在：**
```typescript
export interface BytePlusContentImageUrl {
  type: 'image_url'
  image_url: {
    url: string
    role?: 'first_frame' | 'last_frame'  // ✅ 已有
  }
}

export interface BytePlusVideoRequest {
  model: string
  content: BytePlusContent[]
  callback_url?: string
  return_last_frame?: boolean  // ✅ 已有
}

export interface BytePlusVideoResponse {
  id: string
  model: string
  status: BytePlusVideoTaskStatus
  content?: {
    video_url?: string
    last_frame_url?: string  // ✅ 已有
  }
  // ... 其他字段
}
```

**如果缺失，添加上述类型定义。**

---

### Step 3: 修改 BytePlus API 工具函数

#### 3.1 更新状态映射函数

**文件：** `lib/services/byteplus/video/utils.ts`

**查找：**
```typescript
export function mapBytePlusResponseToStatus(response: BytePlusVideoResponse): VideoStatusResponse {
  return {
    data: {
      id: response.id,
      status: mapBytePlusStatus(response.status),
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      error: response.error?.message,
      progress: response.status === 'running' ? 50 : response.status === 'succeeded' ? 100 : 0,
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString(),
    },
  }
}
```

**替换为：**
```typescript
export function mapBytePlusResponseToStatus(response: BytePlusVideoResponse): VideoStatusResponse {
  return {
    data: {
      id: response.id,
      status: mapBytePlusStatus(response.status),
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      lastFrameUrl: response.content?.last_frame_url,  // 🔥 新增：映射末尾帧 URL
      error: response.error?.message,
      progress: response.status === 'running' ? 50 : response.status === 'succeeded' ? 100 : 0,
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString(),
    },
  }
}
```

---

### Step 4: 修改 Seedance API 调用

#### 4.1 默认启用 return_last_frame

**文件：** `lib/services/byteplus/video/seedance-api.ts`

**查找：**
```typescript
export async function submitVideoGeneration(
  request: VideoGenerationRequest,
  options?: { callbackUrl?: string; returnLastFrame?: boolean }
): Promise<VideoGenerationResponse> {
  const byteplusRequest: BytePlusVideoRequest = convertToBytePlusRequest(request, options)

  console.log('[BytePlus Video] submit', {
    model: byteplusRequest.model,
    hasImage: byteplusRequest.content.some(c => c.type === 'image_url'),
    callback: !!byteplusRequest.callback_url,
  })

  const response = await client.request<SubmitVideoResponse>(
    '/contents/generations/tasks',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest),
    }
  )

  return {
    data: {
      id: response.id,
    },
  }
}
```

**替换为：**
```typescript
export async function submitVideoGeneration(
  request: VideoGenerationRequest,
  options?: { callbackUrl?: string; returnLastFrame?: boolean }
): Promise<VideoGenerationResponse> {
  const byteplusRequest: BytePlusVideoRequest = convertToBytePlusRequest(request, options)

  // 🔥 默认启用 return_last_frame（除非显式设置为 false）
  if (options?.returnLastFrame !== false) {
    byteplusRequest.return_last_frame = true
  }

  console.log('[BytePlus Video] submit', {
    model: byteplusRequest.model,
    hasImage: byteplusRequest.content.some(c => c.type === 'image_url'),
    callback: !!byteplusRequest.callback_url,
    returnLastFrame: byteplusRequest.return_last_frame,  // 🔥 新增日志
  })

  const response = await client.request<SubmitVideoResponse>(
    '/contents/generations/tasks',
    {
      method: 'POST',
      body: JSON.stringify(byteplusRequest),
    }
  )

  return {
    data: {
      id: response.id,
    },
  }
}
```

---

### Step 5: 重构批量视频生成逻辑

这是最核心的改动！

#### 5.1 备份原有函数

**文件：** `lib/services/video-agent/video-generator.ts`

```bash
# 创建备份
cp lib/services/video-agent/video-generator.ts lib/services/video-agent/video-generator.ts.backup
```

#### 5.2 修改 VideoClipResult 类型

**在文件顶部找到：**
```typescript
export interface VideoClipResult {
  shot_number: number
  task_id?: string
  video_url?: string
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
  retry_count?: number
}
```

**替换为：**
```typescript
export interface VideoClipResult {
  shot_number: number
  task_id?: string
  video_url?: string
  lastFrameUrl?: string  // 🔥 新增：末尾帧 URL
  status: 'pending' | 'generating' | 'completed' | 'failed'
  error?: string
  retry_count?: number
}
```

#### 5.3 创建链式生成函数

**在文件末尾添加新函数：**

```typescript
/**
 * 🔥 链式生成视频片段（使用首尾帧过渡）
 *
 * 关键特性：
 * 1. 顺序生成（非并行）- 确保每个片段都能使用上一个片段的末尾帧
 * 2. 第一个片段使用分镜图，后续片段使用前一个片段的末尾帧
 * 3. 如果某个片段失败，终止后续生成（避免链条断裂）
 *
 * @param storyboards 分镜图列表
 * @param shots 分镜脚本列表
 * @param options 生成选项
 * @returns 视频片段任务列表
 */
export async function batchGenerateVideosWithTransition(
  storyboards: Storyboard[],
  shots: Shot[],
  options: BatchVideoGenerationOptions
): Promise<VideoClipResult[]> {
  const {
    watermark = false,
    resolution = '1080p',
    model = 'vidfab-q1',
    aspectRatio = '16:9'
  } = options

  const results: VideoClipResult[] = []
  let previousLastFrameUrl: string | undefined = undefined

  console.log('[VideoAgent] 开始链式生成视频片段', {
    totalShots: storyboards.length,
    mode: 'sequential_with_transition'
  })

  // 🔥 关键：顺序生成（而非并行）
  for (let i = 0; i < storyboards.length; i++) {
    const storyboard = storyboards[i]
    const shot = shots.find(s => s.shot_number === storyboard.shot_number)

    if (!shot || storyboard.status !== 'success') {
      const error = !shot ? '未找到对应的分镜脚本' : '分镜图生成失败'
      console.error(`[VideoAgent] 片段 ${storyboard.shot_number} 跳过:`, error)

      results.push({
        shot_number: storyboard.shot_number,
        status: 'failed',
        error
      })
      continue
    }

    try {
      // 🔥 第一个片段：使用分镜图
      // 🔥 后续片段：使用上一个片段的末尾帧
      const firstFrameUrl = i === 0 ? storyboard.image_url : previousLastFrameUrl

      if (!firstFrameUrl) {
        throw new Error(`片段 ${shot.shot_number} 缺少首帧图像（上一个片段可能未返回末尾帧）`)
      }

      // 构建视频生成 Prompt
      const videoPrompt = buildVideoPrompt(shot)

      // 构建视频生成请求
      const videoRequest: VideoGenerationRequest = {
        image: firstFrameUrl,  // 🔥 使用链式首帧
        prompt: videoPrompt,
        model,
        duration: shot.duration_seconds,
        resolution,
        aspectRatio,
        cameraFixed: true,  // 单镜头模式
        watermark,
        seed: shot.seed
      }

      console.log(`[VideoAgent] 生成片段 ${i + 1}/${storyboards.length}`, {
        shot_number: shot.shot_number,
        firstFrameSource: i === 0 ? 'storyboard' : 'previous_last_frame',
        firstFrameUrl: firstFrameUrl.substring(0, 60) + '...',
        duration: shot.duration_seconds
      })

      // 🔥 提交生成任务（return_last_frame 默认启用）
      const submitResult = await submitVideoGeneration(videoRequest, {
        returnLastFrame: true
      })

      console.log(`[VideoAgent] 片段 ${shot.shot_number} 任务已提交，等待完成...`, {
        task_id: submitResult.data.id
      })

      // 轮询等待完成
      const pollResult = await pollVideoStatus(submitResult.data.id)

      if (pollResult.status === 'failed') {
        throw new Error(pollResult.error || '视频生成失败')
      }

      // 🔥 保存末尾帧 URL，供下一个片段使用
      previousLastFrameUrl = pollResult.lastFrameUrl

      results.push({
        shot_number: shot.shot_number,
        task_id: submitResult.data.id,
        video_url: pollResult.video_url,
        lastFrameUrl: pollResult.lastFrameUrl,  // 🔥 保存末尾帧
        status: 'completed'
      })

      console.log(`[VideoAgent] 片段 ${shot.shot_number} 完成 ✓`, {
        video_url: pollResult.video_url?.substring(0, 60) + '...',
        hasLastFrame: !!pollResult.lastFrameUrl,
        lastFrameUrl: pollResult.lastFrameUrl?.substring(0, 60) + '...'
      })

    } catch (error: any) {
      console.error(`[VideoAgent] 片段 ${shot.shot_number} 生成失败:`, error)

      results.push({
        shot_number: shot.shot_number,
        status: 'failed',
        error: error.message || '视频生成失败'
      })

      // 🔥 生成失败时，终止后续片段（因为链条断裂）
      const remainingCount = storyboards.length - i - 1
      if (remainingCount > 0) {
        console.warn(`[VideoAgent] ⚠️ 链式生成中断，剩余 ${remainingCount} 个片段将跳过`)

        // 标记剩余片段为失败
        for (let j = i + 1; j < storyboards.length; j++) {
          results.push({
            shot_number: storyboards[j].shot_number,
            status: 'failed',
            error: '前序片段生成失败，链条中断'
          })
        }
      }

      break  // 终止循环
    }
  }

  console.log('[VideoAgent] 链式生成完成', {
    total: storyboards.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed: results.filter(r => r.status === 'failed').length
  })

  return results
}
```

#### 5.4 修改 pollVideoStatus 函数（支持返回 lastFrameUrl）

**查找：**
```typescript
export async function pollVideoStatus(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{ video_url: string; status: 'completed' | 'failed'; error?: string }> {
  // ... 现有逻辑
}
```

**替换为：**
```typescript
export async function pollVideoStatus(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{
  video_url: string
  lastFrameUrl?: string  // 🔥 新增
  status: 'completed' | 'failed'
  error?: string
}> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkVideoStatus(taskId)

      console.log(`[VideoAgent] 轮询视频状态 (${i + 1}/${maxAttempts}):`, {
        taskId,
        status: status.data.status,
        progress: status.data.progress
      })

      if (status.data.status === 'completed') {
        if (!status.data.outputs || status.data.outputs.length === 0) {
          throw new Error('视频生成完成但未返回视频 URL')
        }

        return {
          video_url: status.data.outputs[0],
          lastFrameUrl: status.data.lastFrameUrl,  // 🔥 返回末尾帧
          status: 'completed'
        }
      }

      if (status.data.status === 'failed') {
        return {
          video_url: '',
          status: 'failed',
          error: status.data.error || '视频生成失败'
        }
      }

      // 等待下次轮询
      await sleep(intervalMs)
    } catch (error: any) {
      console.error(`[VideoAgent] 轮询视频状态失败 (${i + 1}/${maxAttempts}):`, error)

      if (i === maxAttempts - 1) {
        return {
          video_url: '',
          status: 'failed',
          error: error.message || '视频状态查询失败'
        }
      }

      await sleep(intervalMs)
    }
  }

  // 超时
  return {
    video_url: '',
    status: 'failed',
    error: '视频生成超时(5分钟)'
  }
}
```

---

### Step 6: 更新 API 路由

**文件：** `app/api/video-agent/projects/[id]/videos/generate/route.ts`

#### 6.1 找到视频生成调用

**查找：**
```typescript
const videoClips = await batchGenerateVideos(
  storyboards,
  shots,
  { ... }
)
```

**替换为：**
```typescript
// 🔥 使用新的链式生成函数
const videoClips = await batchGenerateVideosWithTransition(
  storyboards,
  shots,
  {
    userId: project.user_id,
    resolution: '1080p',
    aspectRatio: project.aspect_ratio || '16:9',
    watermark: false
  }
)
```

#### 6.2 保存到数据库时包含 lastFrameUrl

**查找保存逻辑，确保包含 last_frame_url：**

```typescript
// 保存视频片段到数据库
for (const clip of videoClips) {
  await supabase.from('project_video_clips').insert({
    project_id: projectId,
    shot_number: clip.shot_number,
    video_url: clip.video_url,
    last_frame_url: clip.lastFrameUrl,  // 🔥 保存末尾帧
    status: clip.status,
    seedance_task_id: clip.task_id,
    retry_count: clip.retry_count || 0,
    error_message: clip.error
  })
}
```

---

### Step 7: 测试验证

#### 7.1 单元测试（模拟）

创建测试文件验证逻辑：

**文件：** `lib/services/video-agent/__tests__/video-generator.test.ts`

```typescript
import { batchGenerateVideosWithTransition } from '../video-generator'

// Mock BytePlus API
jest.mock('@/lib/services/byteplus/video/seedance-api', () => ({
  submitVideoGeneration: jest.fn(),
  checkVideoStatus: jest.fn()
}))

describe('batchGenerateVideosWithTransition', () => {
  it('should use first storyboard image for first clip', async () => {
    // ... 测试第一个片段使用分镜图
  })

  it('should use previous last frame for subsequent clips', async () => {
    // ... 测试后续片段使用末尾帧
  })

  it('should stop generation if a clip fails', async () => {
    // ... 测试链条断裂时的行为
  })
})
```

#### 7.2 集成测试（实际调用）

使用小规模数据测试：

```typescript
// 测试脚本
const testStoryboards = [
  { shot_number: 1, image_url: 'https://...', status: 'success' },
  { shot_number: 2, image_url: 'https://...', status: 'success' }
]

const testShots = [
  { shot_number: 1, duration_seconds: 5, description: '...', /* ... */ },
  { shot_number: 2, duration_seconds: 5, description: '...', /* ... */ }
]

const result = await batchGenerateVideosWithTransition(
  testStoryboards,
  testShots,
  {
    userId: 'test-user',
    resolution: '720p',  // 使用较低分辨率加快测试
    aspectRatio: '16:9'
  }
)

console.log('测试结果:', result)
// 验证：
// 1. result[0].lastFrameUrl 存在
// 2. result[1] 的生成使用了 result[0].lastFrameUrl（检查日志）
// 3. 视频可以正常播放
```

#### 7.3 视觉验证

生成完成后，手动检查视频：

1. **下载生成的视频片段**
2. **逐帧查看片段 1 的末尾和片段 2 的开头**
3. **验证角色位置、场景是否连贯**

```bash
# 使用 FFmpeg 提取帧
ffmpeg -i clip1.mp4 -vf "select='eq(n\,149)'" -vframes 1 clip1_last_frame.png
ffmpeg -i clip2.mp4 -vf "select='eq(n\,0)'" -vframes 1 clip2_first_frame.png

# 对比两张图片
open clip1_last_frame.png clip2_first_frame.png
```

---

## 常见问题

### Q1: 如果 BytePlus API 没有返回 last_frame_url 怎么办？

**检查：**
```typescript
// 在 pollVideoStatus 中添加日志
console.log('BytePlus 响应:', status.data)

// 如果 status.data.lastFrameUrl 为 undefined，说明：
// 1. API 响应中没有 last_frame_url 字段
// 2. 需要检查 BytePlus API 文档确认是否支持
```

**应对措施：**
- 如果 API 不支持，可能需要使用其他方法（如手动提取视频末尾帧）
- 联系 BytePlus 技术支持确认功能可用性

### Q2: 顺序生成太慢怎么办？

**优化策略：**
```typescript
// 方案 1: 减少轮询间隔（更频繁检查）
const pollResult = await pollVideoStatus(taskId, 60, 3000)  // 3 秒间隔

// 方案 2: 使用 Webhook 回调（推荐）
const submitResult = await submitVideoGeneration(videoRequest, {
  returnLastFrame: true,
  callbackUrl: `${process.env.APP_URL}/api/webhooks/video-generation`
})
```

### Q3: 如果中间某个片段生成失败，如何恢复？

**恢复策略：**
```typescript
// 1. 记录失败的片段编号
// 2. 从失败片段的前一个成功片段重新开始
// 3. 使用前一个成功片段的 last_frame_url

// 示例：片段 3 失败，从片段 2 重新生成
const clip2 = await getVideoClipFromDB(projectId, 2)
const previousLastFrame = clip2.last_frame_url

// 重新生成片段 3
const clip3 = await generateVideoClip(previousLastFrame, shot3)
```

---

## 验收标准

✅ **数据库迁移成功**：`project_video_clips` 表包含 `last_frame_url` 字段
✅ **类型定义完整**：所有类型包含 `lastFrameUrl` 字段
✅ **API 调用正确**：`return_last_frame: true` 出现在请求中
✅ **链式生成工作**：第二个片段使用第一个片段的末尾帧
✅ **日志清晰**：能够看到首帧来源（storyboard vs previous_last_frame）
✅ **数据库保存**：`last_frame_url` 正确保存到数据库
✅ **视觉验证**：片段之间过渡自然，无明显跳跃

---

## 下一步

完成 Phase 1 后，进入 [Phase 2: 统一时长和淡入淡出](./phase-2-unified-duration-crossfade.md)

---

**预估完成时间：4-6 小时**
**建议：分两个工作日完成，每天 2-3 小时，避免疲劳**
