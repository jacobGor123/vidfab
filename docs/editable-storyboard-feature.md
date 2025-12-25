# 可编辑分镜功能说明

## 功能概述

在 Video Agent 的第一步（脚本分析步骤），用户现在可以**编辑 AI 生成的分镜描述**，修改后的描述会影响后续角色 prompt 的生成，从而让视频更符合用户的预期。

## 改动方案

采用**方案 1**（只修改分镜描述，角色列表不变）：
- 用户可以修改每个分镜的视觉描述
- 角色列表保持不变（仍然基于原始脚本提取）
- 修改后的分镜描述会影响角色 prompt 的生成

## 实现的文件

### 1. 前端修改 `/app/studio/video-agent-beta/components/steps/Step1ScriptAnalysis.tsx`

**新增功能**：
- 分镜描述由静态文本改为可编辑的 `<Textarea>`
- 实时跟踪用户的修改（`editedShots` 状态）
- 显示"Save Changes"和"Cancel"按钮（当有未保存修改时）
- 自动保存：点击"Confirm & Continue"时自动保存修改

**核心状态管理**：
```typescript
const [editedShots, setEditedShots] = useState<Record<number, string>>({})
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [isSaving, setIsSaving] = useState(false)
```

**核心函数**：
- `handleShotDescriptionChange(shotNumber, newDescription)` - 处理描述修改
- `handleSaveChanges()` - 保存修改到数据库
- `handleCancelChanges()` - 取消未保存的修改
- `getShotDescription(shotNumber, originalDescription)` - 获取分镜描述（优先使用编辑后的）

### 2. 新增 API `/app/api/video-agent/projects/[id]/route.ts`

**方法**: `PATCH`

**功能**: 更新项目数据（包括 `script_analysis`）

**允许更新的字段**：
- `script_analysis`（包含修改后的分镜）
- `story_style`
- `duration`
- `aspect_ratio`
- `enable_narration`

**安全机制**：
- 验证用户身份
- 验证项目所有权
- 只允许更新指定字段

### 3. 已有服务自动适配 `/lib/services/video-agent/character-prompt-generator.ts`

**无需修改**，因为该服务已经在使用分镜描述：

```typescript
const characterContexts = characters.map(char => {
  const appearances = shots
    .filter(shot => shot.characters?.includes(char))
    .map(shot => ({
      shotNumber: shot.shot_number,
      description: shot.description,  // 👈 会使用修改后的描述
      action: shot.character_action,
      mood: shot.mood
    }))
  ...
})
```

## 使用流程

### Step 1 - 脚本分析（可编辑）

1. AI 分析用户脚本，生成分镜列表
2. 每个分镜的**描述显示在 Textarea 中**，可以直接编辑
3. 用户修改分镜描述后：
   - 顶部显示"Save Changes"和"Cancel"按钮
   - 点击"Save Changes"保存修改
   - 点击"Cancel"放弃修改
4. 点击"Confirm & Continue"进入下一步
   - 如果有未保存的修改，会自动保存

### Step 2 - 角色配置

1. 角色列表基于**原始脚本**提取（不受分镜修改影响）
2. 生成角色 prompt 时，使用**修改后的分镜描述**作为上下文
3. 生成的角色图片会更符合用户调整后的视觉需求

## 数据流

```
用户输入脚本
    ↓
AI 分析 → 生成分镜描述
    ↓
用户编辑分镜描述 ← 【新功能】
    ↓
保存到数据库 (script_analysis.shots[].description)
    ↓
生成角色 prompt（参考修改后的分镜描述）
    ↓
生成角色图片
```

## 技术细节

### 状态管理策略

使用**增量更新**策略：
- `editedShots` 只记录被修改的分镜（key: shotNumber, value: newDescription）
- 显示时优先使用 `editedShots`，若无则使用原始描述
- 保存时合并修改到完整的 `shots` 数组

### 保存时机

1. **手动保存**：点击"Save Changes"按钮
2. **自动保存**：点击"Confirm & Continue"时
3. **防丢失**：如果有未保存修改，会先保存再进入下一步

### 性能优化

- Textarea 使用受控组件，实时更新状态
- 只在有修改时显示保存按钮
- 使用 `resize-none` 禁用 Textarea 拖拽调整大小

## 用户体验优化

1. **视觉反馈**：
   - 修改后立即显示保存/取消按钮
   - 保存中显示"Saving..."状态

2. **防止误操作**：
   - 提供"Cancel"按钮快速恢复
   - 点击下一步时自动保存，防止丢失修改

3. **编辑体验**：
   - Textarea 自动调整高度（min-height: 80px）
   - 使用深色主题配色，与整体设计一致
   - Focus 时边框高亮（蓝色）

## 改动评估

**前端改动**：约 80 行代码
- 新增状态管理
- 新增编辑和保存逻辑
- 修改显示组件

**后端改动**：约 100 行代码
- 新增 PATCH API
- 无需修改现有服务

**总工作量**：约 1-2 小时
**风险等级**：低（不影响现有功能，纯新增）

## 后续扩展建议

1. **版本历史**：记录分镜描述的修改历史，支持回退
2. **实时预览**：修改描述时实时预览可能的视觉效果
3. **AI 辅助优化**：提供"优化此分镜"按钮，AI 重写描述
4. **批量编辑**：支持一次性修改多个分镜的风格
5. **导入导出**：支持导出/导入分镜描述（JSON 格式）

## 注意事项

1. **角色列表不会改变**：修改分镜描述不会重新提取角色
2. **数据一致性**：保存后立即更新本地状态和 store
3. **错误处理**：保存失败时保留用户的修改，可以重试
