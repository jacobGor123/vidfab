# 任务计划：移除 character_action 独立字段

## 目标
将 `character_action` 从独立字段改为融入 `video_prompt` / `description` 中，让 AI 在初始分析时直接把动作描述合并到场景描述里，而不是作为单独字段拼接。

## 动机
- 用户认为当前的 character_action 独立拼接方式不够灵活
- 希望 AI 生成时就直接把动作融入描述，而非后期拼接
- 简化 prompt 结构，提高可控性

## 阶段规划

### Phase 1: AI Prompt 修改（高风险）
**状态**: ✅ completed
**文件**: `lib/services/video-agent/processors/script/prompt-builder.ts`

**任务**:
1. 删除第 72-75 行 `character_action` 字段说明
2. 删除第 108 行 JSON schema 中的 `character_action` 示例
3. 修改 `description` 说明，强调包含角色动作
4. 更新示例，把动作融入 description

**风险**: 🔥 高 - AI 生成质量可能受影响，需要充分测试

---

### Phase 2: 脚本分析 API（中等风险）
**状态**: ✅ completed
**文件**: `app/api/video-agent/projects/[id]/analyze-script/route.ts`

**任务**:
1. 修改第 115-127 行 `generateVideoPrompt` 函数
   - 删除 `character_action` 拼接逻辑
   - 保留 `camera_angle` 和 `mood` 拼接
2. 修改第 136 行，删除 `character_action: shot.character_action`
3. 修改第 139 行，删除 `video_prompt` 生成中的 `character_action` 部分

**依赖**: Phase 1 完成后执行

---

### Phase 3: 视频生成 API（中等风险）
**状态**: ✅ completed
**文件**: `app/api/video-agent/projects/[id]/videos/generate/route.ts`

**任务**:
1. 第 99 行（Veo3 路径）：删除 `${shot.character_action}.` 拼接
2. 第 181 行（BytePlus 路径）：删除 `${shot.character_action}.` 拼接
3. 第 353 行：插入 project_shots 时删除 `character_action` 字段

**依赖**: Phase 2 完成后执行

---

### Phase 4: 视频重试 API（中等风险）
**状态**: ✅ completed
**文件**: `app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts`

**任务**:
1. 第 149-152 行（JSON 模式）：删除 `characterAction` 变量和拼接
2. 第 159、164、169 行：删除 `${shot.character_action}` 拼接

**依赖**: Phase 3 完成后执行

---

### Phase 5: Storyboard Prompt Builder（高风险）
**状态**: ✅ completed
**文件**: `lib/services/video-agent/processors/storyboard/storyboard-prompt-builder.ts`

**任务**:
1. 第 27 行：删除 `character_action` 拼接到 `sceneText`
2. 第 110-142 行：重构 `annotateCharacterTypes` 函数
   - 删除 `characterAction` 参数
   - 删除返回值中的 `characterAction`
   - 简化逻辑，只处理 description
3. 第 249 行：删除镜子场景检测中的 `character_action`
4. 第 273-278 行：更新 `annotateCharacterTypes` 调用
5. 第 301 行：删除 `Action: ${annotated.characterAction}. ` 行

**风险**: 🔥 高 - 逻辑复杂，影响分镜图生成质量

**依赖**: Phase 4 完成后执行

---

### Phase 6: Storyboard Core（中等风险）
**状态**: ✅ completed
**文件**: `lib/services/video-agent/processors/storyboard/storyboard-core.ts`

**任务**:
1. 第 27 行：删除 `character_action` 拼接
2. 第 66 行：JSON 解析时删除 `character_action` 字段处理

**依赖**: Phase 5 完成后执行

---

### Phase 7: 前端清理（低风险）
**状态**: ✅ completed
**文件**:
- `app/studio/video-agent-beta/components/steps/Step2CharacterConfig/hooks/useCharacterManagement.ts`
- `app/studio/video-agent-beta/components/steps/Step2CharacterConfig/hooks/useCharacterState.ts`
- `app/studio/video-agent-beta/components/steps/Step1ScriptAnalysis.tsx`

**任务**:
1. 删除角色名称替换逻辑中的 `character_action` 字段处理
2. 从字段数组中移除 `'character_action'`

**依赖**: Phase 6 完成后执行

---

### Phase 8: 类型定义清理（低风险，可选）
**状态**: ✅ completed
**文件**: `lib/stores/video-agent/types.ts`

**任务**:
1. 将 `character_action: string` 改为 `character_action?: string`（可选，向后兼容）

**依赖**: Phase 7 完成后执行

---

## 测试策略

### 单元测试（每个 Phase 后）
- Phase 1: 测试 AI 生成的 description 是否包含完整动作
- Phase 5: 测试分镜图 prompt 构建是否正确
- Phase 3/4: 测试视频 prompt 拼接是否正确

### 集成测试（完成后）
1. 创建新项目，输入测试脚本
2. 检查生成的 script_analysis
3. 生成分镜图，检查质量
4. 生成视频，检查 prompt 正确性

### 回归测试
1. 测试现有老项目是否仍能正常运行（向后兼容）
2. 测试角色名称替换功能是否正常

---

## 关键决策记录

| 决策 | 理由 | 日期 |
|------|------|------|
| 保留 character_action 字段为可选 | 向后兼容，不破坏老数据 | 2026-01-22 |
| 不删除数据库字段 | 避免数据迁移，老项目仍可用 | 2026-01-22 |
| 分阶段推进 | 降低风险，每阶段可独立测试 | 2026-01-22 |

---

## 错误日志

| 错误 | 尝试次数 | 解决方案 |
|------|---------|---------|
| - | - | - |

---

## 文件修改清单

| 文件 | 状态 | 修改内容 |
|------|------|---------|
| `lib/services/video-agent/processors/script/prompt-builder.ts` | ✅ completed | 删除 character_action 字段说明 |
| `app/api/video-agent/projects/[id]/analyze-script/route.ts` | ✅ completed | 修改 generateVideoPrompt 函数 |
| `app/api/video-agent/projects/[id]/videos/generate/route.ts` | ✅ completed | 删除拼接逻辑 |
| `app/api/video-agent/projects/[id]/videos/[shotNumber]/retry/route.ts` | ✅ completed | 删除拼接逻辑 |
| `lib/services/video-agent/processors/storyboard/storyboard-prompt-builder.ts` | ✅ completed | 重构 annotateCharacterTypes |
| `lib/services/video-agent/processors/storyboard/storyboard-core.ts` | ✅ completed | 删除 character_action 处理 |
| 前端 hooks (3个文件) | ✅ completed | 删除字段数组中的 character_action |
| `lib/stores/video-agent/types.ts` | ✅ completed | 改为可选字段 |

---

## 下一步行动
1. 用户确认计划
2. 开始 Phase 1：修改 AI Prompt
3. 提交测试，验证 AI 生成质量
