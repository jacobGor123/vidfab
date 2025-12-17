# Video Agent 自然过渡优化 - 实施进度追踪

> **最后更新:** 2025-12-17
> **状态:** 准备阶段完成，等待 Phase 1 实施

---

## ✅ 已完成工作

### 1. 架构梳理（2025-12-17）

- ✅ 完整梳理现有视频生成流程
- ✅ 确认 BytePlus API 的 `return_last_frame` 支持情况
- ✅ 确认 Veo 3.1 集成现状
- ✅ 确认前端旁白开关已实现
- ✅ 分析 Suno 集成和调用时机

### 2. 数据库迁移（2025-12-17）

- ✅ 创建迁移 SQL: `lib/database/migrations/add-last-frame-and-audio.sql`
- ✅ 已执行数据库迁移，新增字段：
  - `project_video_clips.last_frame_url` - 末尾帧 URL
  - `project_video_clips.last_frame_storage_path` - 末尾帧存储路径
  - `project_video_clips.video_request_id` - Veo3 request ID
  - `project_video_clips.video_status` - 第三方 API 状态
  - `video_agent_projects.aspect_ratio` - 横竖屏比例
  - `video_agent_projects.enable_narration` - 启用旁白模式
  - `video_agent_projects.suno_task_id` - Suno 任务 ID
  - `video_agent_projects.suno_prompt` - Suno Prompt
  - `video_agent_projects.suno_status` - Suno 状态
  - `video_agent_projects.suno_error_message` - Suno 错误信息

### 3. 方案确认（2025-12-17）

#### 时长统一方案
- ✅ 确认统一 5 秒时长（Veo 3.1 会映射为 6 秒，因最低支持 4 秒）
- ✅ 新的分镜数量映射：
  - 15s → 3 个分镜（5s/个）
  - 30s → 6 个分镜（5s/个）
  - 45s → 9 个分镜（5s/个）
  - 60s → 12 个分镜（5s/个）

#### Suno 背景音乐生成时机
- ✅ 确认使用 Suno（通过 KIE API）
- ✅ 生成时机：在脚本分析时由 LLM 生成 Suno prompt，然后在分镜图生成时并行启动 Suno 任务

#### 模式切换
- ✅ 前端旁白开关已实现（`InputStage.tsx:216-227`）
- ✅ 模式 A（旁白）：Veo3.1-Fast + Doubao TTS + 字幕
- ✅ 模式 B（默认）：Seedance Pro + Suno 背景音乐

---

## 🔴 发现的关键问题（需要立即修复）

### 问题 1: Veo 3.1 音频设置错误 🔴

**文件:** `lib/services/video-agent/veo3-video-generator.ts`

**位置:** 第 91 行和第 100 行

**当前代码:**
```typescript
// 第 91 行
const enhancedPrompt = `${request.prompt}, with clear voiceover narration in storytelling style`

// 第 100 行
generate_audio: true  // ❌ 会生成 Veo 自带音频，与 Doubao TTS 冲突
```

**需要修改为:**
```typescript
// 第 91 行：删除这行增强 prompt，直接使用原始 prompt
// const enhancedPrompt = `${request.prompt}, with clear voiceover narration in storytelling style`  // 删除

// 第 94 行：修改为使用原始 prompt
const apiRequest: any = {
  prompt: request.prompt,  // 直接使用原始 prompt，不添加旁白描述
  image: request.image,
  aspect_ratio: request.aspectRatio,
  duration: veo3Duration,
  resolution: '720p',
  generate_audio: false  // 🔥 关键修改：关闭 Veo 音频，使用 Doubao TTS
}
```

**影响:** Phase 4（Veo 3.1 + Doubao TTS + 字幕）

---

### 问题 2: BytePlus API 未映射 `last_frame_url` 🔴

**文件:** `lib/services/byteplus/video/utils.ts`

**位置:** 第 79-91 行

**需要修改:**

```typescript
// 1. 修改 mapBytePlusResponseToStatus 函数
export function mapBytePlusResponseToStatus(response: BytePlusVideoResponse): VideoStatusResponse {
  return {
    data: {
      id: response.id,
      status: mapBytePlusStatus(response.status),
      outputs: response.content?.video_url ? [response.content.video_url] : undefined,
      lastFrameUrl: response.content?.last_frame_url,  // 🔥 新增：映射 last_frame_url
      error: response.error?.message,
      progress: response.status === 'running' ? 50 : response.status === 'succeeded' ? 100 : 0,
      created_at: new Date(response.created_at * 1000).toISOString(),
      updated_at: new Date(response.updated_at * 1000).toISOString(),
    },
  }
}
```

**同时需要修改类型定义:**

**文件:** `lib/types/video.ts`

```typescript
export interface VideoStatusResponse {
  data: {
    id: string
    status: 'queued' | 'processing' | 'completed' | 'failed'
    outputs?: string[]
    lastFrameUrl?: string  // 🔥 新增：末尾帧 URL
    error?: string
    progress?: number
    created_at?: string
    updated_at?: string
  }
}
```

**影响:** Phase 1（首尾帧链式过渡）

---

## 📋 待实施任务

### Phase 1: 首尾帧链式过渡（P0 - 最高优先级）

**预估时间:** 4-6 小时

**任务清单:**
- [ ] 修复问题 1: Veo 3.1 音频设置
- [ ] 修复问题 2: BytePlus API `lastFrameUrl` 映射
- [ ] 修改 `video-generator.ts`: 从并行改为顺序生成
- [ ] 实现链式传递 `lastFrameUrl` 逻辑
- [ ] 更新数据库保存 `last_frame_url`
- [ ] 测试验证

**参考文档:**
- `docs/video-agent-implementation/phase-1-last-frame-transition.md`

---

### Phase 2: 统一时长 + 淡入淡出（P1）

**预估时间:** 3-4 小时

**任务清单:**
- [ ] 修改 `script-analyzer.ts`: 调整分镜数量映射（统一 5 秒）
- [ ] 修改 LLM Prompt: 要求生成统一 5 秒时长的分镜
- [ ] 实现 FFmpeg xfade 交叉淡化（0.5 秒）
- [ ] 测试验证

**参考文档:**
- `docs/video-agent-implementation/phase-2-unified-duration-crossfade.md`

---

### Phase 3: Suno 背景音乐集成（P1）

**预估时间:** 4-5 小时

**任务清单:**
- [ ] 修改 `script-analyzer.ts`: LLM 额外生成 Suno prompt
- [ ] 在分镜图生成时并行启动 Suno 任务
- [ ] 实现 Suno 状态轮询和数据库更新
- [ ] 实现视频合成时的音频混音
- [ ] 测试验证

**参考文档:**
- `docs/video-agent-implementation/phase-3-doubao-tts-integration.md`（需要调整为 Suno）

---

### Phase 4: Veo 3.1 配置 + 字幕生成（P2）

**预估时间:** 3-4 小时

**任务清单:**
- [ ] 实现 Doubao TTS 集成（旁白模式）
- [ ] 实现字幕生成（SRT 格式）
- [ ] 实现旁白音频与视频混音
- [ ] 测试验证旁白模式

**参考文档:**
- `docs/video-agent-implementation/phase-4-veo3-narration-subtitles.md`

---

## 🎯 当前状态

**准备阶段:** ✅ 已完成
**数据库迁移:** ✅ 已完成
**关键问题识别:** ✅ 已完成

**下一步:** 开始 Phase 1 实施

---

## 📞 交接说明

新对话需要完成的工作：
1. 修复 2 个关键问题（Veo 3.1 音频设置 + BytePlus API 映射）
2. 实施 Phase 1: 首尾帧链式过渡
3. 实施 Phase 2: 统一时长 + 淡入淡出
4. 实施 Phase 3: Suno 背景音乐集成
5. 实施 Phase 4: Veo 3.1 配置 + 字幕生成

**关键提醒:**
- 每个 Phase 完成后立即测试
- 使用 Git 管理，每个阶段提交一次
- 遵循文档中的实施步骤
- 遇到问题参考对应 Phase 文档的 FAQ 部分
