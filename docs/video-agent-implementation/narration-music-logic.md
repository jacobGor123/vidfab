# Video Agent - 旁白与音乐逻辑说明

## 核心逻辑

Video Agent 支持两种模式，由 `enable_narration` 字段控制：

### 模式 A：背景音乐模式 (enable_narration = false)
```
用户不勾选"开启旁白"
  ↓
enable_narration = false
  ↓
┌─────────────────────────────────┐
│ 1. 生成分镜图（无音频）          │
│ 2. 🎵 并行启动 Suno 音乐生成    │
│ 3. 生成视频片段（BytePlus）     │
│ 4. 合成：拼接 + 添加背景音乐    │
└─────────────────────────────────┘
  ↓
最终视频 = 视频 + 背景音乐
```

**特点**：
- 使用 BytePlus Seedance 生成视频（无音频）
- Suno AI 生成纯音乐背景（instrumental）
- 音量适中（30%）

---

### 模式 B：旁白模式 (enable_narration = true)
```
用户勾选"开启旁白"
  ↓
enable_narration = true
  ↓
┌─────────────────────────────────┐
│ 1. 生成分镜图（无音频）          │
│ 2. ❌ 跳过 Suno 音乐生成        │
│ 3. 生成视频片段（Veo 3.1）      │
│ 4. 合成：拼接 + 添加字幕        │
└─────────────────────────────────┘
  ↓
最终视频 = 视频 + 旁白音频 + 字幕
```

**特点**：
- 使用 Google Veo 3.1 生成视频（带旁白音频）
- **不生成** Suno 背景音乐（避免冲突）
- 自动添加英文字幕（基于 character_action）

---

## 实现细节

### 1. 分镜图生成阶段
**文件**: `app/api/video-agent/projects/[id]/storyboards/generate/route.ts`

```typescript
// 🔥 只在非旁白模式下启动 Suno
if (project.music_generation_prompt && !project.enable_narration) {
  // 并行启动 Suno 音乐生成
  const generateResponse = await sunoAPI.generate({
    prompt: project.music_generation_prompt,
    make_instrumental: true,
    wait_audio: false
  })
} else if (project.enable_narration) {
  console.log('Skipping music generation (narration mode enabled)')
}
```

**逻辑**：
- ✅ 非旁白模式 → 启动 Suno（后台异步）
- ❌ 旁白模式 → 跳过 Suno，记录日志

---

### 2. 视频合成阶段
**文件**: `app/api/video-agent/projects/[id]/compose/route.ts`

```typescript
let musicUrl = project.music_url

// 旁白模式下不添加背景音乐
if (project.enable_narration) {
  console.log('Skipping background music (narration mode enabled)')
  musicUrl = null
}
// 非旁白模式：检查 Suno 状态并添加音乐
else if (project.suno_task_id && !musicUrl) {
  const sunoStatus = await sunoAPI.getStatus(project.suno_task_id)
  // ...
}

// 添加背景音乐（如果有）
if (musicUrl) {
  await addBackgroundMusic(...)
}

// 添加字幕（仅旁白模式）
if (project.enable_narration) {
  await addSubtitlesToVideo(...)
}
```

**逻辑**：
- 旁白模式：强制 `musicUrl = null`，跳过音乐混音
- 非旁白模式：检查并使用 Suno 音乐

---

## 数据流

### 背景音乐模式
```
步骤 1: 脚本分析
  └─> music_generation_prompt ✓

步骤 3: 分镜图生成
  └─> suno_task_id ✓

步骤 6: 视频合成
  └─> music_url ✓ (从 Suno 获取)
```

### 旁白模式
```
步骤 1: 脚本分析
  └─> music_generation_prompt ✓ (虽然生成了，但不使用)

步骤 3: 分镜图生成
  └─> suno_task_id ✗ (不启动 Suno)

步骤 6: 视频合成
  └─> music_url ✗ (强制为 null)
  └─> 添加字幕 ✓
```

---

## 为什么旁白模式不要背景音乐？

1. **音频冲突**：Veo 3.1 生成的视频已包含旁白音频，再加背景音乐会混乱
2. **用户体验**：旁白模式聚焦于故事叙述，背景音乐会分散注意力
3. **成本优化**：减少 Suno API 调用，节省费用
4. **简化流程**：避免复杂的音频混音（旁白 + 背景音乐 + 音量平衡）

---

## 未来优化（可选）

如果需要支持"旁白 + 轻背景音乐"：

```typescript
// 可以添加一个新字段
enable_background_music_with_narration: boolean

// 音量策略
const musicVolume = project.enable_narration
  ? 0.10  // 旁白模式：10% 音量（非常轻）
  : 0.30  // 纯音乐模式：30% 音量
```

但当前产品需求是：**旁白模式不要背景音乐**（场景 A）。

---

## 相关文件

- `app/api/video-agent/projects/[id]/storyboards/generate/route.ts` - Suno 启动逻辑
- `app/api/video-agent/projects/[id]/compose/route.ts` - 音乐/字幕添加逻辑
- `lib/services/suno/suno-api.ts` - Suno API 封装
- `lib/services/video-agent/subtitle-generator.ts` - 字幕生成器

---

## 测试验证

### 测试用例 1：背景音乐模式
```
1. 创建项目，enable_narration = false
2. 分析脚本 → 检查 music_generation_prompt
3. 生成分镜图 → 检查 suno_task_id (应该有值)
4. 合成视频 → 检查最终视频包含背景音乐
```

### 测试用例 2：旁白模式
```
1. 创建项目，enable_narration = true
2. 分析脚本 → 检查 music_generation_prompt (仍会生成)
3. 生成分镜图 → 检查 suno_task_id (应该为空)
4. 合成视频 → 检查最终视频包含字幕，无背景音乐
```

---

**最后更新**: 2025-01-XX
**相关 Phase**: Phase 3, Phase 4
