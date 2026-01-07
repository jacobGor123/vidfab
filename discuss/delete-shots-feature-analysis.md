# 删除分镜功能 - 完整影响分析与实施方案

## 📋 需求概述

用户希望在两个步骤添加删除分镜的功能：

1. **Step 1 (Script Analysis)**: 删除分镜描述（Shot）
2. **Step 3 (Storyboard Generation)**: 删除分镜图片

## 🔍 数据流分析

### 当前数据流

```
Step 1: Script Analysis
  ↓ (生成 script_analysis)
  └─> script_analysis.shots[]  (每个 shot 有 shot_number: 1, 2, 3...)
  └─> script_analysis.characters[] (从所有 shots 中提取)

Step 2: Character Configuration
  ↓ (读取 script_analysis.characters)
  └─> 为每个角色生成参考图
  └─> 保存到 project_characters 表

Step 3: Storyboard Generation
  ↓ (读取 script_analysis.shots)
  └─> 为每个 shot 生成分镜图
  └─> 保存到 project_storyboards 表 (关联 shot_number)

Step 4: Video Generation
  ↓ (读取 script_analysis.shots + project_storyboards)
  └─> 为每个 shot 生成视频
  └─> 保存到 project_video_clips 表 (关联 shot_number)

Step 5: Final Composition
  ↓ (读取 project_video_clips)
  └─> 按 shot_number 顺序合成最终视频
```

## ⚠️ 关键影响点

### 1. **shot_number 的连续性问题**

**当前假设：**
- `shot_number` 是从 1 开始的连续整数 (1, 2, 3, 4, 5...)
- 后续步骤都依赖这个顺序

**删除 shot 后的影响：**
- **方案 A（保持原编号）**: shot_number 会有间隙 (1, 3, 4, 5...)
  - ❌ 可能导致数组索引越界
  - ❌ 最终合成时顺序可能混乱

- **方案 B（重新编号）**: 删除后重新编号 (1, 2, 3, 4...)
  - ✅ 保持数据连续性
  - ⚠️ 需要级联更新所有相关表

### 2. **Character 配置的影响**

**Step 2 的角色来源：**
```typescript
// Step2CharacterConfig/hooks/useCharacterState.ts:26
const characters = project.script_analysis?.characters || []
```

**影响分析：**
- `script_analysis.characters` 是从所有 `shots[].characters` 中汇总的
- 如果删除某个 shot，可能导致某些角色不再出现在任何 shot 中
- 需要重新分析角色列表

**示例：**
```javascript
// 原始数据
shots = [
  { shot_number: 1, characters: ['Alice'] },
  { shot_number: 2, characters: ['Bob'] },
  { shot_number: 3, characters: ['Alice', 'Bob'] }
]
characters = ['Alice', 'Bob']  // 从 shots 中提取

// 删除 shot 2 后
shots = [
  { shot_number: 1, characters: ['Alice'] },
  { shot_number: 2, characters: ['Alice', 'Bob'] }  // 重新编号后
]
characters = ['Alice', 'Bob']  // 仍然保留 Bob

// 但如果删除 shot 2 和 3
shots = [
  { shot_number: 1, characters: ['Alice'] }
]
characters = ['Alice']  // Bob 消失了！
```

### 3. **Storyboard 数据库记录的影响**

**数据表结构：**
```sql
-- project_storyboards 表
CREATE TABLE project_storyboards (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES video_agent_projects(id),
  shot_number INTEGER NOT NULL,
  image_url TEXT,
  status TEXT,
  ...
)
```

**影响：**
- 如果删除 shot，对应的 storyboard 记录也应该删除
- 如果重新编号，需要更新所有后续记录的 `shot_number`

### 4. **Video Clips 数据库记录的影响**

**数据表结构：**
```sql
-- project_video_clips 表
CREATE TABLE project_video_clips (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES video_agent_projects(id),
  shot_number INTEGER NOT NULL,
  video_url TEXT,
  seedance_task_id TEXT,
  ...
)
```

**影响：**
- 同样需要删除或更新 `shot_number`

### 5. **Final Composition 的影响**

**合成逻辑：**
- 最终视频按 `shot_number` 顺序合成
- 如果 shot_number 有间隙，可能导致合成失败或顺序错误

## 💡 推荐实施方案

### 方案 A：物理删除 + 重新编号（✅ 推荐）

**优点：**
- ✅ 数据始终保持连续和一致
- ✅ 后续步骤无需特殊处理
- ✅ 符合用户预期（真正删除）
- ✅ 数据库查询简单高效

**缺点：**
- ⚠️ 需要级联更新多个表
- ⚠️ 实现复杂度较高
- ⚠️ 无法恢复已删除的数据

**实施步骤：**

#### Step 1 删除分镜描述

1. **前端 UI 修改**
   ```tsx
   // Step1ScriptAnalysis.tsx
   // 在每个 shot 卡片上添加删除按钮
   <button onClick={() => handleDeleteShot(shot.shot_number)}>
     Delete Shot
   </button>
   ```

2. **删除逻辑实现**
   ```typescript
   const handleDeleteShot = async (shotNumber: number) => {
     // 1. 从 shots 数组中删除
     const newShots = shots.filter(s => s.shot_number !== shotNumber)

     // 2. 重新编号（从 1 开始）
     const reindexedShots = newShots.map((shot, index) => ({
       ...shot,
       shot_number: index + 1
     }))

     // 3. 重新分析角色列表
     const newCharacters = extractUniqueCharacters(reindexedShots)

     // 4. 更新 script_analysis
     const newAnalysis = {
       ...script_analysis,
       shots: reindexedShots,
       characters: newCharacters,
       shot_count: reindexedShots.length
     }

     // 5. 保存到数据库
     await updateProject(project.id, {
       script_analysis: newAnalysis
     })

     // 6. 删除相关的 storyboards 和 video_clips（如果存在）
     await deleteRelatedData(project.id, shotNumber)

     // 7. 重置后续步骤状态（因为数据已变化）
     await resetStepsFromStep2(project.id)
   }
   ```

3. **后端 API 支持**
   ```typescript
   // DELETE /api/video-agent/projects/[id]/shots/[shotNumber]
   export async function DELETE(req, { params }) {
     const { id, shotNumber } = params

     // 1. 获取项目
     const project = await getProject(id)

     // 2. 删除并重新编号 shots
     const shots = project.script_analysis.shots.filter(
       s => s.shot_number !== parseInt(shotNumber)
     )
     const reindexed = shots.map((s, i) => ({ ...s, shot_number: i + 1 }))

     // 3. 重新提取角色
     const characters = extractCharacters(reindexed)

     // 4. 更新 script_analysis
     await supabase
       .from('video_agent_projects')
       .update({
         script_analysis: {
           ...project.script_analysis,
           shots: reindexed,
           characters,
           shot_count: reindexed.length
         }
       })
       .eq('id', id)

     // 5. 删除相关的 storyboard 记录
     await supabase
       .from('project_storyboards')
       .delete()
       .eq('project_id', id)
       .eq('shot_number', shotNumber)

     // 6. 删除相关的 video_clips 记录
     await supabase
       .from('project_video_clips')
       .delete()
       .eq('project_id', id)
       .eq('shot_number', shotNumber)

     // 7. 更新后续 shot 的 shot_number（级联更新）
     // 对于所有 shot_number > deleted_number 的记录，都要 -1
     for (let i = shotNumber + 1; i <= project.script_analysis.shot_count; i++) {
       await supabase
         .from('project_storyboards')
         .update({ shot_number: i - 1 })
         .eq('project_id', id)
         .eq('shot_number', i)

       await supabase
         .from('project_video_clips')
         .update({ shot_number: i - 1 })
         .eq('project_id', id)
         .eq('shot_number', i)
     }

     // 8. 重置项目步骤状态（如果已经进行到后续步骤）
     if (project.current_step >= 2) {
       await resetProjectSteps(id, 2)  // 从 Step 2 开始重置
     }

     return { success: true }
   }
   ```

#### Step 3 删除分镜图片

1. **前端 UI 修改**
   ```tsx
   // Step3StoryboardCard.tsx
   // 添加删除按钮
   <button onClick={() => handleDeleteStoryboard(shot.shot_number)}>
     Delete Storyboard
   </button>
   ```

2. **删除逻辑**
   ```typescript
   const handleDeleteStoryboard = async (shotNumber: number) => {
     // 确认对话框
     const confirmed = await showConfirm(
       'This will delete the shot from the entire project. All related storyboards and videos will be removed. This action cannot be undone.',
       {
         title: 'Delete Shot',
         confirmText: 'Delete',
         cancelText: 'Cancel'
       }
     )

     if (!confirmed) return

     // 调用删除 API（同 Step 1 的逻辑）
     await deleteShot(project.id, shotNumber)

     // 重新加载项目数据
     await refreshProject()
   }
   ```

### 方案 B：逻辑删除（标记为已删除）

**优点：**
- ✅ 实现简单
- ✅ 可以恢复
- ✅ 保留历史记录

**缺点：**
- ❌ 所有查询都需要过滤 `deleted: true`
- ❌ 数据库中有冗余数据
- ❌ shot_number 仍会有间隙

**实施步骤：**

1. **修改 Shot 类型**
   ```typescript
   export interface Shot {
     shot_number: number
     deleted?: boolean  // 新增字段
     // ... 其他字段
   }
   ```

2. **所有读取 shots 的地方都需要过滤**
   ```typescript
   // 过滤已删除的 shots
   const activeShots = project.script_analysis.shots.filter(s => !s.deleted)

   // 重新编号显示（不改变原始 shot_number）
   const displayShots = activeShots.map((s, index) => ({
     ...s,
     display_number: index + 1  // 用于显示
   }))
   ```

3. **问题：**
   - 后续步骤的 `shot_number` 仍会有间隙
   - 需要在所有地方都正确处理 `deleted` 字段

### 方案 C：跳过功能（不推荐）

**说明：**
- 不是真正删除，只是标记为"跳过"
- 在生成时跳过这些 shots

**缺点：**
- ❌ 不符合用户"删除"的预期
- ❌ 数据仍然存在，可能引起混淆

## 🎯 最终建议

### 推荐方案 A（物理删除 + 重新编号）

**理由：**
1. 数据一致性最好
2. 后续维护成本低
3. 符合用户预期

**关键注意事项：**

1. **必须重新编号**
   - 删除 shot 2 后，shot 3, 4, 5... 必须变成 2, 3, 4...
   - 确保 shot_number 始终从 1 开始连续

2. **必须级联更新**
   - 更新 `project_storyboards.shot_number`
   - 更新 `project_video_clips.shot_number`

3. **必须重新分析角色**
   - 删除 shot 可能导致某些角色消失
   - 重新提取 `script_analysis.characters`
   - 删除不再需要的 `project_characters` 记录

4. **必须重置后续步骤**
   - 如果删除 shot 后，Step 2/3/4 的数据可能不一致
   - 建议重置状态，让用户重新生成

5. **用户体验优化**
   - 显示明确的警告信息
   - 提供撤销功能（可选）
   - 显示删除影响范围

## 📝 实施清单

### Phase 1: Step 1 删除分镜描述

- [ ] 前端 UI
  - [ ] 在 Shot 卡片添加删除按钮
  - [ ] 添加确认对话框（警告影响范围）
  - [ ] 处理删除后的状态更新

- [ ] 后端 API
  - [ ] 创建 `DELETE /api/video-agent/projects/[id]/shots/[shotNumber]`
  - [ ] 实现重新编号逻辑
  - [ ] 实现角色重新提取逻辑
  - [ ] 实现级联删除/更新 storyboards
  - [ ] 实现级联删除/更新 video_clips
  - [ ] 实现步骤状态重置

- [ ] 测试
  - [ ] 删除第一个 shot
  - [ ] 删除中间的 shot
  - [ ] 删除最后一个 shot
  - [ ] 删除多个 shot
  - [ ] 验证角色列表更新
  - [ ] 验证后续步骤重置

### Phase 2: Step 3 删除分镜图片

- [ ] 前端 UI
  - [ ] 在 Storyboard 卡片添加删除按钮
  - [ ] 复用 Step 1 的删除逻辑

- [ ] 测试
  - [ ] 删除已生成分镜图的 shot
  - [ ] 删除已生成视频的 shot
  - [ ] 验证数据一致性

## ⚡ 快速验证测试

### 测试场景 1：删除不影响角色

```
初始状态：
  Shot 1: Alice
  Shot 2: Bob
  Shot 3: Alice, Bob
  Characters: [Alice, Bob]

删除 Shot 2:
  Shot 1: Alice
  Shot 2: Alice, Bob (原 Shot 3)
  Characters: [Alice, Bob] ✅ 保持不变
```

### 测试场景 2：删除影响角色

```
初始状态：
  Shot 1: Alice
  Shot 2: Bob
  Shot 3: Alice
  Characters: [Alice, Bob]

删除 Shot 2:
  Shot 1: Alice
  Shot 2: Alice (原 Shot 3)
  Characters: [Alice] ✅ Bob 被移除
```

### 测试场景 3：级联更新验证

```
初始状态：
  Shots: [1, 2, 3, 4, 5]
  Storyboards: [1, 2, 3, 4, 5]
  Videos: [1, 2, 3, 4, 5]

删除 Shot 2:
  Shots: [1, 2, 3, 4] ✅ 重新编号
  Storyboards: [1, 2, 3, 4] ✅ 级联更新
  Videos: [1, 2, 3, 4] ✅ 级联更新
```

## 🚨 风险提示

1. **数据丢失风险**
   - 删除是永久性的
   - 建议添加恢复机制（软删除 + 时间窗口）

2. **性能风险**
   - 级联更新可能较慢（对于大量 shots）
   - 建议使用事务确保数据一致性

3. **用户体验风险**
   - 删除后需要重新生成后续内容
   - 可能导致用户困惑或不满

## 🎓 总结

**核心结论：**
- ✅ 删除功能**会影响**后续逻辑，必须仔细处理
- ✅ 推荐使用**物理删除 + 重新编号**方案
- ✅ 必须实现**级联更新**和**步骤重置**
- ✅ 必须提供**明确的用户提示**

**关键要点：**
1. shot_number 必须保持连续（1, 2, 3...）
2. 删除 shot 后必须重新分析角色列表
3. 必须级联删除/更新 storyboards 和 video_clips
4. 必须重置后续步骤状态（避免数据不一致）
5. 必须提供清晰的确认对话框（告知影响范围）
