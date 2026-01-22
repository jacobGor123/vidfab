# 研究发现：character_action 使用分析

## 当前架构分析

### character_action 的生命周期

```
1. AI 分析阶段（/analyze-script）
   ├─ Gemini 2.0 Flash 根据 prompt 生成
   ├─ 保存到 script_analysis.shots[].character_action
   └─ 保存到 project_shots 表

2. Storyboard 生成阶段
   ├─ storyboard-prompt-builder.ts 读取 character_action
   ├─ 用于构建场景文本（角色类型识别）
   └─ 拼接到最终的分镜图 prompt

3. Video 生成阶段
   ├─ /videos/generate 读取 character_action
   ├─ 拼接到 enhancedPrompt
   └─ 提交给视频模型（Veo3 或 BytePlus）

4. Video 重试阶段
   ├─ /videos/[shotNumber]/retry 可接收自定义 prompt
   └─ 仍会拼接 character_action（JSON 模式支持覆盖）
```

---

## 关键发现

### 1. character_action 在 3 个地方被拼接

**位置 1: Storyboard Prompt Builder**
```typescript
// lib/services/video-agent/processors/storyboard/storyboard-prompt-builder.ts:27
const sceneText = `${shot.description} ${shot.character_action}`.toLowerCase()

// 用途：角色类型识别（cat/man/woman）
// 影响：annotateCharacterTypes 函数依赖此字段
```

**位置 2: Video Generation API**
```typescript
// app/api/video-agent/projects/[id]/videos/generate/route.ts:99
// Veo3 路径
const enhancedPrompt = `${shot.description}. ${shot.character_action}. No text...`

// app/api/video-agent/projects/[id]/videos/generate/route.ts:181
// BytePlus 路径
const enhancedPrompt = `Maintain exact character... ${shot.description}. ${shot.character_action}. Keep all...`
```

**位置 3: Video Retry API**
```typescript
// app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts:152
finalPrompt = `${description}. ${characterAction}`
```

---

### 2. AI Prompt 结构

**当前 Prompt**（`lib/services/video-agent/processors/script/prompt-builder.ts`）

```
为每个分镜提供以下详细信息：

a) description (场景视觉描述)
   - 用英文描述场景的核心视觉元素
   - 包含环境、人物位置、主要物体

b) camera_angle (镜头角度)
   - 镜头类型: Wide shot / Medium shot...

c) character_action (角色动作)  ← 🔥 需要删除
   - 描述角色的具体动作和行为
   - 示例: "Looking at her watch nervously, then glancing down the street"
```

**问题**: AI 被明确要求把动作单独提取到 `character_action` 字段

---

### 3. annotateCharacterTypes 函数的复杂性

**函数签名**:
```typescript
function annotateCharacterTypes(
  description: string,
  characterAction: string,  // 🔥 依赖 character_action
  parsedCharacters: ParsedCharacter[]
): { description: string; characterAction: string }
```

**逻辑**:
1. 解析角色名称和类型（cat/man/woman）
2. 在 description 和 characterAction 中查找角色名
3. 首次出现时添加类型标识（"Ginger" → "the cat Ginger"）
4. 优先在 description 中替换，找不到才在 characterAction 中替换

**影响**: 删除 character_action 后，此函数需要大幅简化

---

### 4. 向后兼容性考虑

**现有数据库记录**:
- `video_agent_projects.script_analysis` 中包含 `character_action`
- `project_shots` 表中有 `character_action` 列

**策略**:
- 不删除数据库字段
- 类型定义改为可选 (`character_action?: string`)
- 老项目仍能读取和显示 character_action（但新项目不再生成）

---

## 风险评估

### 高风险点

**1. AI 生成质量**
- **风险**: 修改 prompt 后，AI 可能不再把动作信息融入 description
- **缓解**: 在 prompt 中强调"包含角色的具体动作和行为"
- **测试**: 生成 5-10 个测试样本，人工检查质量

**2. Storyboard 质量**
- **风险**: annotateCharacterTypes 简化后，角色类型识别可能失效
- **缓解**: sceneText 仍然包含完整的 description（现在包含动作）
- **测试**: 生成包含多个角色的分镜图，检查是否正确识别类型

### 中等风险点

**3. Video Prompt 拼接**
- **风险**: 删除 character_action 后，video prompt 信息减少
- **缓解**: description 现在包含更完整的信息
- **测试**: 对比新旧 prompt 的视频生成质量

---

## 实施顺序合理性验证

### 为什么先改 AI Prompt？

**原因**: AI Prompt 是源头，决定了数据结构

**验证**:
- ✅ 如果先改后端拼接逻辑，AI 仍会生成独立的 character_action
- ✅ 先改 AI Prompt，后端才能读到融合后的 description
- ✅ 测试 AI Prompt 效果后，才能确定后续实施是否可行

### Phase 依赖关系

```
Phase 1 (AI Prompt)
    ↓
Phase 2 (脚本分析 API) - 依赖新的数据结构
    ↓
Phase 3 (视频生成 API) - 依赖 Phase 2 保存的数据
    ↓
Phase 4 (视频重试 API) - 依赖 Phase 3 的拼接逻辑
    ↓
Phase 5 (Storyboard Prompt Builder) - 可与 Phase 3/4 并行
    ↓
Phase 6 (Storyboard Core) - 依赖 Phase 5
    ↓
Phase 7 (前端清理) - 所有后端完成后
    ↓
Phase 8 (类型定义) - 最后清理
```

---

## 关键代码片段

### 需要删除的拼接示例

```typescript
// ❌ 当前做法（3 处拼接）
const sceneText = `${shot.description} ${shot.character_action}`.toLowerCase()
const enhancedPrompt = `${shot.description}. ${shot.character_action}. No text...`
prompt += `Action: ${annotated.characterAction}. `

// ✅ 改后（description 已包含动作）
const sceneText = shot.description.toLowerCase()
const enhancedPrompt = `${shot.description}. No text...`
// 不再需要单独的 Action 行
```

---

## 测试样本设计

### 测试用脚本 1（简单场景）
```
A cat named Ginger walks into a kitchen and jumps on the counter.
```

**期望**:
- description 包含 "A cat named Ginger walks into a kitchen and jumps on the counter"
- 不再有单独的 character_action

### 测试用脚本 2（多角色）
```
John and his dog Max play fetch in the park. Max catches the ball and runs back to John.
```

**期望**:
- description 包含两个角色的动作
- Storyboard 能正确识别 "the man John" 和 "the dog Max"

### 测试用脚本 3（复杂动作）
```
A robot stands in a factory, welding metal parts. Sparks fly as it moves precisely along the seam.
```

**期望**:
- description 包含连续动作描述
- Video prompt 能正确传递给模型

---

---

## 🆕 新问题：人物切换后分镜描述未更新

### 问题场景

**用户操作流程**：
1. Step 1：AI 分析脚本，生成了人物（比如 "Ginger (cat)"）
2. Step 2：用户点击"选择预设模板人物"
3. 用户选择了一个预设人物（比如 "Fluffy (cat)"）
4. **问题**：script_analysis.shots 中的 description 还是提到 "Ginger"，没有更新为 "Fluffy"

---

### 根本原因分析

#### 1. 人物名称更新逻辑的位置

**现有的两个更新机制**：

**机制 A：handleConfirm（Step 2 的"确认并继续"按钮）**
```typescript
// app/studio/video-agent-beta/components/steps/Step2CharacterConfig/hooks/useCharacterManagement.ts:302-364

const handleConfirm = async () => {
  // 检测名称变更
  const nameMapping: Record<string, string> = {}
  Object.keys(characterStates).forEach(key => {
    const state = characterStates[key]
    if (key !== state.name) {  // 🔥 关键：检测 key 和 name 是否一致
      nameMapping[key] = state.name
    }
  })

  // 如果有名称变更，更新 script_analysis
  if (Object.keys(nameMapping).length > 0 && project.script_analysis) {
    const updatedAnalysis = { ...project.script_analysis }

    // 更新全局角色列表
    updatedAnalysis.characters = Array.from(new Set(
      updatedAnalysis.characters.map(name => nameMapping[name] || name)
    ))

    // 🔥 关键：替换所有 shots 中的文本描述
    updatedAnalysis.shots = updatedAnalysis.shots.map(shot => {
      let updatedShot = { ...shot }

      // 对每个需要替换的名称进行替换
      Object.entries(nameMapping).forEach(([oldName, newName]) => {
        const oldNamePattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
        updatedShot = {
          ...updatedShot,
          description: updatedShot.description.replace(oldNamePattern, newName),
          camera_angle: updatedShot.camera_angle.replace(oldNamePattern, newName),
          mood: updatedShot.mood.replace(oldNamePattern, newName)
        }
      })

      return updatedShot
    })

    await updateProject(project.id, { script_analysis: updatedAnalysis })
  }
}
```

**机制 B：syncCharacterNameToAnalysis（辅助函数，未被调用）**
```typescript
// app/studio/video-agent-beta/components/steps/Step2CharacterConfig/hooks/useCharacterManagement.ts:366-401

const syncCharacterNameToAnalysis = useCallback(async (
  oldName: string,
  newName: string
) => {
  if (!project.script_analysis) return

  const updatedAnalysis = { ...project.script_analysis }

  // 更新全局角色列表
  updatedAnalysis.characters = Array.from(new Set(
    updatedAnalysis.characters.map(name => name === oldName ? newName : name)
  ))

  // 创建正则表达式，匹配旧名称
  const oldNamePattern = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')

  // 更新所有 shots 中的引用
  updatedAnalysis.shots = updatedAnalysis.shots.map(shot => ({
    ...shot,
    characters: Array.from(new Set(
      shot.characters.map(name => name === oldName ? newName : name)
    )),
    description: shot.description.replace(oldNamePattern, newName),
    camera_angle: shot.camera_angle.replace(oldNamePattern, newName),
    character_action: shot.character_action.replace(oldNamePattern, newName),  // ⚠️ 已废弃
    mood: shot.mood.replace(oldNamePattern, newName),
    video_prompt: shot.video_prompt?.replace(oldNamePattern, newName)
  }))

  // 保存到数据库
  await updateProject(project.id, { script_analysis: updatedAnalysis })
  onUpdate({ script_analysis: updatedAnalysis })
}, [project, updateProject, onUpdate])
```

---

#### 2. handleSelectPreset 中缺少更新逻辑

**当前 handleSelectPreset 的行为**：
```typescript
// app/studio/video-agent-beta/components/steps/Step2CharacterConfig/hooks/useCharacterManagement.ts:155-299

const handleSelectPreset = async (characterName: string, preset: CharacterPreset) => {
  const oldName = characterName
  const newName = preset.name

  // 1️⃣ 立即更新 UI 状态
  setCharacterStates(prev => {
    const newStates = { ...prev }
    delete newStates[oldName]  // 🔥 删除旧 key
    newStates[newName] = {     // 🔥 用新 key 插入
      ...currentState,
      name: newName,
      imageUrl: preset.imageUrl,
      mode: 'upload',
      isGenerating: true
    }
    return newStates
  })

  // 2️⃣ 更新数据库中的 characters 表
  await updateCharacters(project.id, { characters: uniqueCharactersData })

  // 3️⃣ 自动分析预设图片，生成描述
  const generatedPrompt = await analyzeCharacterImage(newName, preset.imageUrl)

  // ❌ 缺少：没有调用 syncCharacterNameToAnalysis(oldName, newName)
  // ❌ 结果：script_analysis.shots 中的描述没有更新
}
```

---

#### 3. 为什么 handleConfirm 能工作？

**检测逻辑**：
```typescript
Object.keys(characterStates).forEach(key => {
  const state = characterStates[key]
  if (key !== state.name) {  // 🔥 检测到不一致
    nameMapping[key] = state.name
  }
})
```

**问题**：
- handleSelectPreset 执行后，characterStates 的 key 已经变成了 newName
- 也就是说：`characterStates[newName] = { name: newName, ... }`
- 检测条件 `key !== state.name` 为 `false`（因为 key = newName，state.name = newName）
- **所以即使用户点击"确认并继续"，也不会触发 script_analysis 更新！**

---

### 问题的两层

#### 层面 1：立即反馈缺失
用户切换预设人物后，分镜描述应该**立即**更新，而不是等到点击"确认并继续"。

#### 层面 2：handleConfirm 的检测逻辑失效
即使用户点击"确认并继续"，由于 characterStates 的 key 已经被更新为 newName，检测逻辑也无法识别出名称变更。

---

### 解决方案（待讨论）

#### 方案 1：在 handleSelectPreset 中立即调用 syncCharacterNameToAnalysis

**优点**：
- 立即反馈，用户体验好
- 逻辑清晰，每次切换都会更新

**缺点**：
- 每次切换都会触发数据库更新（可能频繁）
- 如果用户连续切换多次，会产生多次更新请求

**实现**：
```typescript
const handleSelectPreset = async (characterName: string, preset: CharacterPreset) => {
  const oldName = characterName
  const newName = preset.name

  // ... 现有逻辑 ...

  // 🔥 新增：立即同步到 script_analysis
  await syncCharacterNameToAnalysis(oldName, newName)
}
```

---

#### 方案 2：记录名称映射历史，在 handleConfirm 时批量更新

**优点**：
- 只在最终确认时更新一次
- 避免频繁的数据库操作

**缺点**：
- 需要额外的状态管理（nameHistory）
- 用户看不到立即反馈

**实现**：
```typescript
const [nameHistory, setNameHistory] = useState<Record<string, string>>({})

const handleSelectPreset = async (characterName: string, preset: CharacterPreset) => {
  const oldName = characterName
  const newName = preset.name

  // ... 现有逻辑 ...

  // 🔥 新增：记录名称映射
  setNameHistory(prev => ({
    ...prev,
    [oldName]: newName
  }))
}

const handleConfirm = async () => {
  // ... 现有逻辑 ...

  // 🔥 使用 nameHistory 而不是 characterStates 来检测变更
  if (Object.keys(nameHistory).length > 0 && project.script_analysis) {
    // 批量更新所有名称变更
  }
}
```

---

#### 方案 3：后端在 /characters API 中自动同步 script_analysis

**优点**：
- 前端逻辑简化
- 单一职责，数据一致性由后端保证

**缺点**：
- 需要修改后端 API
- 可能影响性能（每次更新 characters 都要更新 script_analysis）

**实现**：
```typescript
// app/api/video-agent/projects/[id]/characters/route.ts

export const PUT = withAuth(async (request, { params, userId }) => {
  // ... 更新 characters ...

  // 🔥 新增：检测名称变更并同步到 script_analysis
  const oldCharacters = project.characters || []
  const newCharacters = body.characters

  const nameMapping: Record<string, string> = {}
  oldCharacters.forEach(oldChar => {
    const newChar = newCharacters.find(nc => nc.id === oldChar.id)
    if (newChar && newChar.name !== oldChar.name) {
      nameMapping[oldChar.name] = newChar.name
    }
  })

  if (Object.keys(nameMapping).length > 0) {
    // 更新 script_analysis
  }
})
```

---

### 推荐方案

**建议采用方案 1（立即调用 syncCharacterNameToAnalysis）**

**理由**：
1. 用户体验最好（立即反馈）
2. 实现简单（只需要一行代码）
3. 逻辑清晰（每次切换都会更新）
4. 频繁更新的性能问题可以通过防抖解决

**需要注意的点**：
- syncCharacterNameToAnalysis 中有 `character_action` 的更新逻辑，需要删除（已废弃）
- 需要确保 oldName 正确（从 characterStates 的 key 中获取）

---

## 下一步行动
1. 用户确认研究发现和解决方案
2. 决定采用哪个方案
3. 实施修复
