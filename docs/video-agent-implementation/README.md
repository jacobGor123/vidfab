# Video Agent 自然过渡优化实施指南

## 总览

本目录包含 Video Agent 自然过渡优化的完整实施文档，基于 BytePlus Chat2Cartoon 的核心技术，结合项目需求进行定制化改进。

---

## 🎯 实施目标

### 核心优化
1. **首尾帧链式过渡** - 使用 BytePlus API 的 `return_last_frame` 实现片段间无缝衔接
2. **统一 5 秒时长** - 所有分镜片段统一时长，节奏稳定
3. **0.5 秒淡入淡出** - FFmpeg xfade 交叉淡化，消除硬切
4. **Doubao TTS 集成** - 旁白模式和背景音乐模式

### 功能模式

#### 模式 A：启用旁白（enable_narration = true）
```
视频生成：Veo3.1-Fast（generate_audio = false）
音频：Doubao TTS 旁白（场景描述 + 角色动作）
字幕：✅ 英文字幕（SRT 格式）
背景音乐：❌ 无
```

#### 模式 B：默认模式（enable_narration = false）
```
视频生成：Seedance Pro
音频：Doubao TTS 背景音乐（整体音频，如 "upbeat background music"）
字幕：❌ 无
旁白：❌ 无
```

---

## 📋 实施阶段

| 阶段 | 功能 | 优先级 | 预估时间 | 文档 |
|-----|------|-------|---------|------|
| **Phase 1** | 首尾帧链式过渡 | 🔥 P0 | 4-6 小时 | [phase-1-last-frame-transition.md](./phase-1-last-frame-transition.md) |
| **Phase 2** | 统一时长 + 淡入淡出 | P1 | 3-4 小时 | [phase-2-unified-duration-crossfade.md](./phase-2-unified-duration-crossfade.md) |
| **Phase 3** | Doubao TTS 集成 | P1 | 4-5 小时 | [phase-3-doubao-tts-integration.md](./phase-3-doubao-tts-integration.md) |
| **Phase 4** | Veo3.1 配置 + 字幕 | P2 | 3-4 小时 | [phase-4-veo3-narration-subtitles.md](./phase-4-veo3-narration-subtitles.md) |
| **测试** | 完整测试和验证 | - | 4-6 小时 | [testing-guide.md](./testing-guide.md) |

**总预估时间：18-25 小时（2.5-3 个工作日）**

---

## 🚀 快速开始

### 准备工作

1. **确认依赖版本**
   ```bash
   node -v  # >= 18.0.0
   pnpm -v  # >= 8.0.0
   ffmpeg -version  # >= 5.0
   ```

2. **配置环境变量**
   ```bash
   # .env.local
   # BytePlus API
   BYTEPLUS_API_KEY=your_api_key
   BYTEPLUS_REGION=cn-beijing

   # Doubao TTS
   DOUBAO_TTS_APP_ID=your_app_id
   DOUBAO_TTS_ACCESS_TOKEN=your_token
   ```

3. **安装新依赖**
   ```bash
   # FFmpeg fluent-ffmpeg（如未安装）
   pnpm add fluent-ffmpeg
   pnpm add -D @types/fluent-ffmpeg
   ```

### 实施顺序

**建议按照以下顺序逐步实施，每个阶段完成后进行测试验证：**

```
Phase 1（核心）→ 测试 → Phase 2 → 测试 → Phase 3 → 测试 → Phase 4 → 完整测试
```

---

## 📁 文件结构

实施完成后，新增/修改的文件：

```
lib/
├── services/
│   ├── byteplus/
│   │   └── video/
│   │       ├── seedance-api.ts          # ✏️ 修改：启用 return_last_frame
│   │       ├── types.ts                 # ✏️ 修改：新增 lastFrameUrl 类型
│   │       └── utils.ts                 # ✏️ 修改：映射 last_frame_url
│   ├── doubao/                          # 🆕 新建
│   │   ├── tts-api.ts                   # 🆕 TTS 调用
│   │   └── types.ts                     # 🆕 TTS 类型定义
│   └── video-agent/
│       ├── video-generator.ts           # ✏️ 修改：链式生成逻辑
│       ├── veo3-video-generator.ts      # ✏️ 修改：关闭 Veo3 音频
│       ├── script-analyzer.ts           # ✏️ 修改：统一 5 秒时长
│       ├── ffmpeg-executor.ts           # ✏️ 修改：xfade 交叉淡化
│       ├── video-composer.ts            # ✏️ 修改：合成逻辑
│       ├── subtitle-generator.ts        # 🆕 字幕生成
│       └── audio-mixer.ts               # 🆕 音频混音
├── types/
│   └── video.ts                         # ✏️ 修改：新增类型定义
app/
├── api/
│   └── video-agent/
│       └── projects/
│           └── [id]/
│               ├── videos/
│               │   └── generate/
│               │       └── route.ts     # ✏️ 修改：调用链式生成
│               ├── audio/               # 🆕 新建
│               │   └── generate/
│               │       └── route.ts     # 🆕 音频生成 API
│               └── subtitles/           # 🆕 新建
│                   └── generate/
│                       └── route.ts     # 🆕 字幕生成 API
lib/
└── database/
    └── migrations/
        └── add-last-frame-and-audio.sql # 🆕 数据库迁移
```

---

## ⚠️ 重要注意事项

### 1. 顺序生成 vs 并行生成

**关键变化：** 首尾帧链式过渡需要**顺序生成**视频片段，不能并行。

```typescript
// ❌ 之前：并行生成
const tasks = storyboards.map(async (sb) => {
  return await generateVideo(sb)
})
await Promise.all(tasks)

// ✅ 现在：顺序生成
for (let i = 0; i < storyboards.length; i++) {
  const firstFrame = i === 0 ? storyboard.image_url : previousLastFrame
  const result = await generateVideo(firstFrame)
  previousLastFrame = result.lastFrameUrl
}
```

**影响：** 总生成时间会增加（但过渡效果大幅提升）

### 2. 数据库迁移

**必须执行：** 在实施 Phase 1 前执行数据库迁移，添加 `last_frame_url` 等字段。

```bash
# 执行迁移
psql -d your_database -f lib/database/migrations/add-last-frame-and-audio.sql
```

### 3. Veo3.1 音频控制

**注意：** Veo3.1 默认生成音频，需要显式设置 `generate_audio: false`

```typescript
// Veo3.1 请求配置
const veo3Request = {
  image: firstFrameUrl,
  prompt: videoPrompt,
  duration: 5,
  generate_audio: false,  // 🔥 关键：关闭内置音频
  aspect_ratio: aspectRatio
}
```

### 4. Doubao TTS 音色选择

**推荐音色：**
- 旁白模式：`en_us_male_narration_professional`（专业男声）或 `en_us_female_narration_professional`（专业女声）
- 背景音乐模式：需要使用**音乐生成 API**（不是 TTS），或者使用其他音乐生成服务

**重要：** Doubao TTS 是语音合成服务，不能直接生成背景音乐。如果需要背景音乐，建议：
- 使用 Doubao Music Generation API（如果可用）
- 或使用预设音乐库
- 或集成其他音乐生成服务（如 Suno Mini）

---

## 📊 成本预估

### 改进前（每个 30s 视频）
```
GPT-4o-mini:     ¥0.006
Gemini 3 Pro:    ¥0.007
Seedream 4.5:    ¥0.12 (6 张分镜图)
Seedance:        ¥5.25 (35 秒视频)
Suno:            ¥0.50 (背景音乐)
----------------------
总计:            ¥5.88
```

### 改进后（每个 30s 视频）
```
GPT-4o-mini:     ¥0.006
Gemini 3 Pro:    ¥0.007
Seedream 4.5:    ¥0.12 (6 张分镜图)
Seedance/Veo3:   ¥4.50 (30 秒，统一 5 秒 × 6)
Doubao TTS:      ¥0.072 (6 次旁白) 或 ¥0 (如使用免费音乐)
----------------------
总计:            ¥4.70
节省:            ¥1.18 (20% ↓)
```

---

## 🧪 测试策略

### 单元测试
- BytePlus API 调用（mock 测试）
- Doubao TTS 调用（mock 测试）
- FFmpeg 命令构建（快照测试）

### 集成测试
- 完整视频生成流程（2-3 个分镜）
- 首尾帧链式过渡验证
- 音频混音和字幕验证

### 端到端测试
- 旁白模式完整流程
- 默认模式完整流程
- 错误恢复和重试

详见：[testing-guide.md](./testing-guide.md)

---

## 📞 支持和反馈

如果在实施过程中遇到问题：

1. **检查日志**：所有服务都有详细的 console.log
2. **参考原有实现**：对比改动前后的代码
3. **测试验证**：每个阶段完成后立即测试
4. **回滚机制**：使用 Git 管理，每个阶段提交一次

---

## 🎉 预期效果

**改进前：**
```
[片段1] --> 硬切 --> [片段2] --> 硬切 --> [片段3]
   ↑ 跳跃感        ↑ 不连贯        ↑ 突兀
```

**改进后：**
```
[片段1] --淡出0.5s--> [片段2] --淡出0.5s--> [片段3]
  ↓     淡入0.5s       ↓     淡入0.5s       ↓
末尾帧 A → 首帧 B   末尾帧 B → 首帧 C

✅ 平滑过渡
✅ 角色位置连贯
✅ 场景自然衔接
✅ 专业配音/背景音
✅ 成本降低 20%
```

---

开始实施吧！🚀 从 Phase 1 开始，逐步推进。
