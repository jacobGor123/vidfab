# Findings: Video Agent Bug 分析

## 问题描述

### Bug #1: 初次分析镜头数量问题
- **现象**: 第一次复刻视频脚本时，AI 能分析并生成人物，但镜头数只有 1 个
- **预期**: 应该根据脚本内容生成多个镜头（3+ 个）
- **影响**: 用户无法看到完整的分镜规划

### Bug #2: 重新分析后人物消失
- **现象**: 点击 "Re-analyze Script" 按钮重新分析后，镜头数恢复正常，但分镜图编辑弹框中人物引用全部消失
- **预期**: 重新分析后应保留人物数据
- **影响**: 用户无法在分镜图中引用已生成的人物

---

## 发现记录

### 发现 #1: 重新分析会清空 analysis 状态
**Date**: 2026-02-11 18:50
**Source**: `Step1ScriptAnalysis.tsx:134-141`
**Details**:

```typescript
const confirmReanalyze = async () => {
  setReanalyzeConfirmOpen(false)
  setAnalysis(null)  // ❌ 清空分析结果
  setError(null)
  setHasStarted(false)
  await handleAnalyze(true)  // 强制重新分析
}
```

**问题**:
- `setAnalysis(null)` 会导致组件状态被清空
- 此时 `analysis` 为 null，但 `project.characters` 可能已经存在
- StoryboardEditDialog 从 `project.characters` 读取人物数据
- 但重新分析后，人物数据可能被覆盖或未正确合并

### 发现 #2: API 不处理人物数据合并
**Date**: 2026-02-11 18:50
**Source**: `analyze-script/route.ts:104-113`
**Details**:

```typescript
const { error: updateError } = await supabaseAdmin
  .from('video_agent_projects')
  .update({
    script_analysis: analysis as any,  // 完全覆盖
    music_generation_prompt: musicPrompt,
    step_1_status: 'completed'
  } as any)
```

**问题**:
- 重新分析时直接覆盖 `script_analysis` 字段
- **不保留现有的 `project.characters` 数据**
- 导致已生成的人物图片被丢弃

---

## 关键代码位置

### 脚本分析相关
- API: `/api/video-agent/projects/[id]/analyze-script/route.ts`
- 前端: `Step1ScriptAnalysis.tsx`

### 人物数据相关
- StoryboardEditDialog: `/components/steps/Step1ScriptAnalysis/StoryboardEditDialog/index.tsx`
- 人物存储: 待确认

### 镜头数据相关
- 待确认

---

## 数据流分析

### 初次分析流程
1. 用户输入脚本
2. 调用 analyze-script API
3. 生成 script_analysis 数据（包含 shots 和 characters）
4. 更新项目状态
5. UI 渲染镜头列表

### 重新分析流程
1. 用户点击 Re-analyze Script
2. 再次调用 analyze-script API
3. 更新 script_analysis 数据
4. UI 重新渲染

**关键问题**:
- 初次分析为什么只生成 1 个镜头？
- 重新分析时人物数据去哪了？

---

## 假设

### 假设 #1: 镜头截断
- 可能在某处对 shots 数组进行了截断（如 `.slice(0, 1)`）
- 或者 UI 只渲染了第一个镜头

### 假设 #2: 人物数据覆盖
- 重新分析时可能完全覆盖了 script_analysis 对象
- 导致已生成的人物数据丢失

### 假设 #3: 数据源不一致
- 分镜图编辑弹框可能从不同的数据源读取人物
- 重新分析后该数据源未更新

---

### 发现 #3: 人物数据存储在独立的 project_characters 表
**Date**: 2026-02-11 18:55
**Source**: `CharacterGenerationSection/index.tsx:194`
**Details**:

**数据库 Schema**:
```sql
CREATE TABLE project_characters (
  id uuid PRIMARY KEY,
  project_id uuid REFERENCES video_agent_projects(id),
  character_name text NOT NULL,
  source text NOT NULL, -- 'ai_generated' | 'preset'
  template_id uuid NULL,
  generation_prompt text NULL,
  negative_prompt text NULL,
  created_at timestamp,
  updated_at timestamp
)

CREATE TABLE character_reference_images (
  id uuid PRIMARY KEY,
  character_id uuid REFERENCES project_characters(id),
  image_url text NOT NULL,
  image_url_external text NULL,
  cdn_url text NULL,
  image_order int DEFAULT 0,
  created_at timestamp
)
```

**人物数据流**:
1. `script_analysis.characters` 包含人物名称列表（AI 分析结果）
2. CharacterGenerationSection 生成人物图片后，插入 `project_characters` 表
3. 图片 URL 存储在 `character_reference_images` 表
4. 前端从 `project.characters` (join 查询结果) 读取人物数据
5. StoryboardEditDialog 从 `project.characters` 读取人物引用

**问题**:
- 重新分析时，`script_analysis` 被完全覆盖
- **但 `project_characters` 表的数据不会自动删除！**
- 如果新的 `script_analysis.characters` 与旧的不匹配，会导致数据不一致
- StoryboardEditDialog 读取的是数据库中的 `project_characters`，但重新分析后可能出现不一致

### 发现 #4: 前端镜头渲染逻辑正常
**Date**: 2026-02-11 18:56
**Source**: `Step1ScriptAnalysis.tsx:62-84`
**Details**:

```typescript
// 初始渲染 12 个镜头，滚动后批量加载
setVisibleShotCount(Math.min(INITIAL_RENDER_SHOTS, analysis.shots.length))
```

前端渲染逻辑没有问题，会根据 `analysis.shots.length` 显示所有镜头。

**结论**: Bug #1 的问题在于 **API 返回的数据本身只有 1 个 shot**，不是前端过滤导致。

---

## 根因分析

### Bug #1: 初次分析只生成 1 个镜头
**可能原因**:
1. ✅ Gemini API 返回的数据只有 1 个 shot
2. ❓ prompt 构建有问题，导致 AI 理解错误
3. ❓ 用户输入的脚本太短，AI 判断只需要 1 个镜头

**需要验证**:
- 查看 prompt 构建逻辑
- 查看实际的 Gemini API 响应
- 检查是否有日志记录 shots 数量

### Bug #2: 重新分析后人物消失
**根因确认**:
1. ✅ 重新分析时 `script_analysis` 被完全覆盖
2. ✅ `project.characters` 不在 `script_analysis` 内，是独立字段
3. ❌ 重新分析时没有保留 `project.characters` 数据
4. ❌ StoryboardEditDialog 从 `project.characters` 读取，但该字段可能被清空或过期

**修复方案**:
- 重新分析时，保留 `project.characters` 数据
- 或者在重新分析后，自动重新生成人物图片

---

## 待调查问题

- [x] analyze-script API 返回的数据结构是什么？ → JSON with shots array
- [x] 初次分析和重新分析的 API 调用有何不同？ → force=true flag
- [x] 人物数据存储在哪里？ → project.characters (独立字段)
- [x] 镜头列表如何渲染？是否有过滤逻辑？ → 正常，按 analysis.shots 渲染
- [x] Re-analyze Script 按钮的完整实现逻辑？ → 清空状态 + force=true

---

## 修复方案总结

### Bug #2 修复方案（人物消失）

**方案 A（推荐）**: 智能合并人物数据
```typescript
// 在 analyze-script API 的 POST handler 中
// 1. 查询现有的 project_characters
const { data: existingCharacters } = await supabaseAdmin
  .from('project_characters')
  .select('character_name')
  .eq('project_id', projectId)

// 2. 对比新旧人物列表
const newCharNames = analysis.characters || []
const existingCharNames = existingCharacters?.map(c => c.character_name) || []

// 3. 找出需要删除的人物（不在新列表中）
const toDelete = existingCharNames.filter(name => !newCharNames.includes(name))

// 4. 删除这些人物及其图片（级联删除）
if (toDelete.length > 0) {
  await supabaseAdmin
    .from('project_characters')
    .delete()
    .eq('project_id', projectId)
    .in('character_name', toDelete)
}
```

**优点**:
- 保留仍在新分析结果中的人物
- 只删除真正不需要的人物
- 用户体验最好

**方案 B**: 完全清空并重新生成
```typescript
// 删除所有旧人物
await supabaseAdmin
  .from('project_characters')
  .delete()
  .eq('project_id', projectId)
```

**缺点**:
- 会丢失所有已生成的人物图片
- 用户需要重新生成
- 体验差

### Bug #1 修复方案（镜头数量）

**可能的问题**:
1. 用户脚本太短 → 建议 AI 至少生成 3 个镜头
2. Prompt 不够明确 → 强调镜头数量要求

**修复步骤**:
1. 检查 prompt-builder.ts 中的镜头数量说明
2. 添加最小镜头数量验证
3. 如果只返回 1 个镜头，记录警告日志

