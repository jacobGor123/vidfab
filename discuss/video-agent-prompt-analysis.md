# Video Agent Prompt 填充逻辑分析报告

## 📋 概述

本报告分析了 Video Agent 中两个模式（视频复刻和默认模式）下，生成分镜图和分镜视频的 prompt 是否正确填充到任务卡片的 prompt 输入框中。

## 🎯 核心发现

### ⚠️ **存在不一致问题！**

**问题**：前端输入框显示的 prompt 与后端实际使用的完整 prompt **不一致**，这可能导致用户误解和功能异常。

---

## 📊 详细分析

### 1️⃣ 分镜图生成 (Step 3)

#### 前端显示的 Prompt
**文件**: `app/studio/video-agent-beta/components/steps/useStoryboardGeneration.ts:271-276`

```typescript
const getDefaultPrompt = (shotNumber: number): string => {
  const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
  if (!shot) return ''
  return shot.description || ''  // ⚠️ 只显示 description 字段
}
```

**输入框内容**：
```
仅显示场景描述，例如：
"A cozy coffee shop with warm lighting"
```

#### 后端实际使用的 Prompt
**文件**: `lib/services/video-agent/processors/storyboard/storyboard-core.ts:101`

```typescript
const prompt = customPrompt || buildStoryboardPrompt(shot, style, characters, hasReferenceImages)
```

**文件**: `lib/services/video-agent/processors/storyboard/storyboard-prompt-builder.ts:30-80`

```typescript
function buildStoryboardPrompt(
  shot: Shot,
  style: ImageStyle,
  characters: CharacterConfig[],
  hasReferenceImages: boolean
): string {
  let prompt = ''

  // 🔥 角色一致性强调（如有参考图）
  if (hasReferenceImages) {
    prompt += `CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters as shown in the reference images.
MUST maintain 100% identical appearance: same face, same facial features, same hair, same clothing...
`
  }

  // 🔥 场景描述
  prompt += `Scene: ${shot.description}\n`

  // 🔥 镜头角度
  prompt += `Camera: ${shot.camera_angle}\n`

  // 🔥 角色动作
  prompt += `Action: ${shot.character_action}\n`

  // 🔥 情绪氛围
  prompt += `Mood: ${shot.mood}\n`

  // 🔥 人物重复禁止
  prompt += `Each character should appear ONLY ONCE in the image\n`

  // 🔥 风格提示
  prompt += `Style: ${style.style_prompt}\n`

  // 🔥 质量要求
  prompt += `High quality, professional composition`

  return prompt
}
```

**实际 Prompt 内容**：
```
CRITICAL REQUIREMENT: Generate EXACTLY THE SAME characters...
Scene: A cozy coffee shop with warm lighting
Camera: Wide shot
Action: Angela walks in and greets the barista
Mood: Warm and welcoming
Each character should appear ONLY ONCE in the image
Style: Photorealistic style
High quality, professional composition
```

#### ⚠️ 问题分析

**不一致度**: 🔴🔴🔴🔴🔴 (极高)

- 前端只显示了 1 个字段（`description`）
- 后端使用了 7+ 个字段和约束条件
- **丢失信息包括**：
  - ❌ 角色一致性约束（CRITICAL REQUIREMENT）
  - ❌ 镜头角度 (camera_angle)
  - ❌ 角色动作 (character_action)
  - ❌ 情绪氛围 (mood)
  - ❌ 人物重复禁止
  - ❌ 风格提示 (style_prompt)
  - ❌ 质量要求

**影响**：
- 如果用户修改了输入框中的 prompt，重新生成时会**完全替换**后端构建的复杂 prompt
- 用户会丢失所有角色一致性约束、镜头角度、情绪等重要信息
- 导致生成的分镜图质量下降，角色不一致

---

### 2️⃣ 分镜视频生成 (Step 4)

#### 前端显示的 Prompt
**文件**: `app/studio/video-agent-beta/components/steps/useVideoGeneration.ts:262-267`

```typescript
const getDefaultPrompt = (shotNumber: number): string => {
  const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
  if (!shot) return ''
  return `${shot.description}. ${shot.character_action}`  // ⚠️ 只显示 description + character_action
}
```

**输入框内容**：
```
A cozy coffee shop with warm lighting. Angela walks in and greets the barista
```

#### 后端实际使用的 Prompt

**文件**: `app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts`

**旁白模式 (Veo3.1)**: Line 126-131
```typescript
let finalPrompt = customPrompt || `${shot.description}. ${shot.character_action}`

// 🔥 强制添加禁止字幕指令
if (!finalPrompt.includes('No text') && !finalPrompt.includes('no subtitles')) {
  finalPrompt += '. No text, no subtitles, no captions, no words on screen.'
}
```

**实际 Prompt**：
```
A cozy coffee shop with warm lighting. Angela walks in and greets the barista. No text, no subtitles, no captions, no words on screen.
```

**非旁白模式 (BytePlus)**: Line 169-174
```typescript
let finalPrompt = customPrompt || `${shot.description}. ${shot.character_action}`

// 🔥 强制添加禁止字幕指令
if (!finalPrompt.includes('No text') && !finalPrompt.includes('no subtitles')) {
  finalPrompt += '. No text, no subtitles, no captions, no words on screen.'
}
```

**实际 Prompt**：
```
A cozy coffee shop with warm lighting. Angela walks in and greets the barista. No text, no subtitles, no captions, no words on screen.
```

**注意**: 非旁白模式在首次批量生成时还会添加角色一致性约束（参见 `app/api/video-agent/projects/[id]/videos/generate/route.ts:126-130`）:
```typescript
const enhancedPrompt = `Maintain exact character appearance and features from the reference image. ${shot.description}. ${shot.character_action}. Keep all character visual details consistent with the reference. No text, no subtitles, no captions, no words on screen.`
```

#### ⚠️ 问题分析

**不一致度**: 🔴🔴🔴 (中等)

- 前端显示了 2 个字段（`description` + `character_action`）
- 后端使用了 2-3 个部分（description + character_action + 禁止字幕指令 + [可能的角色一致性约束]）
- **丢失信息包括**：
  - ❌ 禁止字幕指令（"No text, no subtitles..."）
  - ❌ 角色一致性约束（首次生成时，非旁白模式）

**影响**：
- 如果用户修改了输入框中的 prompt，重新生成时：
  - ✅ 会自动添加禁止字幕指令（这个问题不大）
  - ❌ 但会丢失角色一致性约束（仅在首次生成时添加）
- 导致重新生成的视频可能与首次生成的视频在角色外观上不一致

---

## 🔍 两种模式的数据源差异

### 默认模式（文字脚本）

**数据流**：
```
用户输入文字脚本
  ↓
保存到 video_agent_projects.original_script
  ↓
调用脚本分析 API (/api/video-agent/projects/[id]/analyze-script)
  ↓
使用 buildScriptAnalysisPrompt 生成 Prompt
  ↓
调用 Gemini 2.0 Flash 分析
  ↓
生成 ScriptAnalysisResult (包含 shots 数组)
  ↓
每个 shot 包含:
  - shot_number
  - description (场景描述)
  - character_action (角色动作)
  - camera_angle (镜头角度)
  - mood (情绪氛围)
  - duration_seconds
  - characters
  - 等等
```

**Prompt 构建**（`lib/services/video-agent/processors/script/prompt-builder.ts`）：
- 基于用户脚本和时长自动生成分镜数量（duration / 5）
- 注入风格指南（STYLE_GUIDES）
- 要求输出 JSON 格式的分镜脚本

### 视频复刻模式（YouTube）

**数据流**：
```
用户输入 YouTube URL
  ↓
调用视频分析 API (/api/video-agent/analyze-video)
  ↓
验证 YouTube URL 并获取视频时长
  ↓
调用 Gemini 2.5 Flash 视频分析
  ↓
使用视频分析 Prompt (骨架锁定协议)
  ↓
生成 ScriptAnalysisResult (与文字模式相同格式)
  ↓
返回给前端 → 创建项目
```

**Prompt 构建**（`lib/services/video-agent/processors/video/video-analyzer-core.ts`）：
- **骨架锁定协议**：确保分镜数量和时长与原视频严格一致
- **镜头识别规则**：区分真正的镜头切换和角色移动
- **跳过无意义镜头**：全黑/全白/纯色/转场效果

**关键差异**：
- ✅ 两种模式生成的 `ScriptAnalysisResult` 格式完全一致
- ✅ 两种模式后续的分镜图和视频生成流程完全相同
- ✅ **不存在因模式差异导致的 prompt 被覆盖问题**

---

## 🐛 存在的问题总结

### 问题 1: 分镜图输入框信息不完整

**问题描述**：
- 前端只显示 `description`
- 后端实际使用包含 7+ 个字段的复杂 prompt

**影响**：
- 用户修改 prompt 后，会丢失所有额外信息
- 导致生成质量下降

**示例**：
```
用户看到：      "A cozy coffee shop"
用户修改为：    "A modern coffee shop"
后端实际使用：  "A modern coffee shop"  ❌ 丢失了镜头角度、角色动作、情绪等
应该使用：      "CRITICAL REQUIREMENT: ...\nScene: A modern coffee shop\nCamera: ...\nAction: ...\n..."
```

### 问题 2: 视频输入框缺少禁止字幕指令

**问题描述**：
- 前端显示 `description + character_action`
- 后端会自动添加禁止字幕指令

**影响**：
- 用户不知道有禁止字幕指令
- 如果用户在 prompt 中添加了字幕相关内容，可能会被自动添加的指令覆盖

### 问题 3: 视频首次生成和重新生成的 prompt 不一致

**问题描述**：
- 首次批量生成（非旁白模式）：添加角色一致性约束
- 重新生成（retry API）：不添加角色一致性约束

**影响**：
- 重新生成的视频可能与首次生成的视频在角色外观上不一致

**代码位置**：
- 首次生成: `app/api/video-agent/projects/[id]/videos/generate/route.ts:126-130`
- 重新生成: `app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts:169-174`

---

## ✅ 建议修复方案

### 方案 1: 前端输入框显示完整 prompt（推荐）

**修改文件**：
- `app/studio/video-agent-beta/components/steps/useStoryboardGeneration.ts`
- `app/studio/video-agent-beta/components/steps/useVideoGeneration.ts`

**修改内容**：

#### 分镜图 getDefaultPrompt:
```typescript
const getDefaultPrompt = (shotNumber: number): string => {
  const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
  if (!shot) return ''

  // 🔥 显示与后端一致的完整 prompt 结构（简化版）
  const parts = [
    shot.description,
    `Camera: ${shot.camera_angle}`,
    `Action: ${shot.character_action}`,
    `Mood: ${shot.mood}`
  ]

  return parts.filter(Boolean).join('\n')
}
```

#### 视频 getDefaultPrompt:
```typescript
const getDefaultPrompt = (shotNumber: number): string => {
  const shot = project.script_analysis?.shots.find(s => s.shot_number === shotNumber)
  if (!shot) return ''

  // 🔥 显示与后端一致的 prompt
  const base = `${shot.description}. ${shot.character_action}`
  const suffix = '. No text, no subtitles, no captions, no words on screen.'

  return base + suffix
}
```

**优点**：
- ✅ 用户看到的内容与实际使用的一致
- ✅ 用户修改后不会丢失重要信息
- ✅ 改动最小，不影响后端逻辑

**缺点**：
- ⚠️ 输入框内容变长，可能需要调整 UI
- ⚠️ 不包含角色一致性约束（这部分是动态生成的，难以完整显示）

### 方案 2: 禁止用户修改 prompt，改为修改字段（更彻底）

**设计思路**：
- 不显示完整 prompt，而是显示可编辑的字段
- 提供多个输入框：描述、镜头角度、角色动作、情绪等
- 后端根据字段重新构建完整 prompt

**优点**：
- ✅ 完全避免 prompt 不一致问题
- ✅ 用户体验更清晰，知道自己在修改什么

**缺点**：
- ❌ 需要大幅修改前端 UI
- ❌ 需要修改 API 接口（传递多个字段而不是单个 customPrompt）
- ❌ 开发成本高

### 方案 3: 后端智能合并 customPrompt（折中方案）

**设计思路**：
- 前端保持现状（只显示部分信息）
- 后端在收到 customPrompt 时，不是完全替换，而是智能合并
- 例如：用户修改了 description，后端仍然保留 camera_angle、mood 等字段

**修改文件**：
- `lib/services/video-agent/processors/storyboard/storyboard-core.ts`

**修改内容**：
```typescript
// 🔥 智能合并 customPrompt
let prompt: string
if (customPrompt) {
  // 用户提供了自定义 prompt，将其作为 description 字段
  const modifiedShot = { ...shot, description: customPrompt }
  prompt = buildStoryboardPrompt(modifiedShot, style, characters, hasReferenceImages)
} else {
  prompt = buildStoryboardPrompt(shot, style, characters, hasReferenceImages)
}
```

**优点**：
- ✅ 用户修改后不会丢失额外信息
- ✅ 前端改动很小

**缺点**：
- ⚠️ 用户仍然不知道完整的 prompt 是什么
- ⚠️ 可能产生语义混乱（用户改的是完整 prompt，但被当作 description 处理）

---

## 📝 推荐执行步骤

### 短期修复（立即执行）

1. ✅ **修复方案 1**：前端输入框显示完整 prompt
   - 修改 `useStoryboardGeneration.ts` 的 `getDefaultPrompt`
   - 修改 `useVideoGeneration.ts` 的 `getDefaultPrompt`
   - 测试重新生成功能

2. ✅ **统一视频生成 prompt**：
   - 修改 `app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts`
   - 添加与首次生成一致的角色一致性约束（非旁白模式）

### 中长期优化（可选）

3. 🔄 **考虑方案 2**：如果用户反馈显示完整 prompt 太长不友好
   - 设计多字段编辑 UI
   - 重构 API 接口

4. 📊 **添加 prompt 预览功能**：
   - 在输入框下方显示"实际使用的完整 prompt"
   - 让用户知道后端会添加哪些额外信息

---

## 🎯 结论

**核心问题**：
- ❌ **分镜图生成**：前端输入框与后端实际 prompt **严重不一致**
- ⚠️ **视频生成**：前端输入框与后端实际 prompt **部分不一致**
- ✅ **两种模式**：数据源不同，但后续流程一致，**不存在模式切换导致的覆盖问题**

**推荐修复**：
- 短期：使用方案 1，让前端输入框显示完整（或更完整）的 prompt
- 长期：考虑方案 2，提供多字段编辑 UI

**优先级**：🔴 高优先级
- 这个问题会直接影响用户体验和生成质量
- 建议尽快修复

---

生成时间：2026-01-07
分析者：Claude Code (Sonnet 4.5)
