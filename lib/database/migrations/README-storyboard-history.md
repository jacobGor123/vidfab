# 分镜图历史版本功能 - 部署指南

## 功能说明

实现分镜图历史版本管理功能：
- ✅ 保存每次重新生成的分镜图（最多20个历史版本）
- ✅ 在分镜编辑弹框中显示历史版本轮播
- ✅ 支持切换到历史版本
- ✅ 自动删除超出限制的旧版本

## 部署步骤

### 1. 执行数据库迁移

在 Supabase SQL Editor 中执行以下脚本：

```bash
/lib/database/migrations/add-storyboard-history.sql
```

这个脚本会：
- 为 `project_storyboards` 表添加 `version` 和 `is_current` 字段
- 创建 `save_storyboard_with_history()` 函数（保存新版本并管理历史）
- 创建 `get_storyboard_history()` 函数（获取历史版本列表）
- 创建 `switch_to_storyboard_version()` 函数（切换版本）

### 2. 前端组件

已创建的组件：
- `StoryboardHistoryCarousel.tsx` - 历史版本轮播组件
- 已修改 `StoryboardEditPanel.tsx` - 集成历史版本轮播
- 已修改 `StoryboardEditDialog/index.tsx` - 添加版本切换逻辑

### 3. 后端API

已创建的API端点：
- `GET /api/video-agent/projects/[id]/storyboards/[shotNumber]/history`
  - 获取指定分镜的所有历史版本
- `POST /api/video-agent/projects/[id]/storyboards/[shotNumber]/switch-version`
  - 切换到指定历史版本
  - Body: `{ version: number }`

### 4. 需要手动修改的部分 ⚠️

**重要**：需要修改分镜图生成API，使用新的历史版本保存函数。

文件：`app/api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate/route.ts`

将第 266-277 行的 UPDATE 语句替换为调用 RPC 函数：

```typescript
// 旧代码（替换前）：
const { error: updateError } = await supabaseAdmin
  .from('project_storyboards')
  .update({
    image_url: result.image_url || null,
    image_url_external: result.image_url || null,
    status: result.status,
    storage_status: result.image_url ? 'pending' : null,
    error_message: result.error || null,
    updated_at: now
  })
  .eq('project_id', projectId)
  .eq('shot_number', shotNumber)

// 新代码（替换后）：
if (result.status === 'success' && result.image_url) {
  // 保存新版本（自动管理历史）
  const { data: newVersion, error: saveError } = await supabaseAdmin
    .rpc('save_storyboard_with_history', {
      p_project_id: projectId,
      p_shot_number: shotNumber,
      p_image_url: result.image_url,
      p_image_storage_path: null,
      p_seedream_task_id: result.taskId || null
    })

  if (saveError) {
    console.error('[Video Agent] Failed to save storyboard version:', saveError)
  } else {
    console.log('[Video Agent] Storyboard version saved:', {
      projectId,
      shotNumber,
      imageUrl: result.image_url
    })
  }
} else {
  // 失败时仍使用 UPDATE（不创建新版本）
  const { error: updateError } = await supabaseAdmin
    .from('project_storyboards')
    .update({
      status: result.status,
      error_message: result.error || null,
      updated_at: now
    })
    .eq('project_id', projectId)
    .eq('shot_number', shotNumber)
    .eq('is_current', true) // 只更新当前版本
}
```

### 5. 同样需要修改批量生成API

文件：`app/api/video-agent/projects/[id]/storyboards/generate/route.ts`

在保存成功的分镜图时，也需要使用 `save_storyboard_with_history()` 函数。

## UI 效果

在分镜编辑弹框中：
1. 当前分镜图显示在顶部
2. 历史版本轮播显示在当前图片下方
3. 最多显示5个缩略图，可左右滑动
4. 点击缩略图切换到对应版本
5. 当前使用的版本显示绿色勾选标记

## 测试步骤

1. 打开一个已有分镜图的项目
2. 点击编辑按钮打开分镜编辑弹框
3. 修改 prompt 并重新生成（重复3-5次）
4. 查看历史版本轮播是否显示所有版本
5. 点击历史版本切换
6. 刷新页面确认切换成功

## 技术细节

### 版本管理策略
- 每次成功生成新图片时创建新版本
- 版本号递增（1, 2, 3, ...）
- `is_current` 标记当前使用的版本
- 超过20个版本时自动删除最旧的

### 数据库约束
- `UNIQUE (project_id, shot_number, version)` - 确保版本号唯一
- 只有 `status='success'` 的版本会被保存
- 失败的生成不创建新版本

### 性能优化
- 使用索引优化查询：`idx_project_storyboards_current`
- 历史版本按版本号倒序排列（最新在前）
- 轮播组件只加载必要的数据

## 回滚方案

如果需要回滚，执行以下SQL：

```sql
-- 删除新增的字段
ALTER TABLE project_storyboards
  DROP COLUMN IF EXISTS version,
  DROP COLUMN IF EXISTS is_current;

-- 恢复旧的唯一约束
ALTER TABLE project_storyboards
  ADD CONSTRAINT unique_storyboard_per_shot
  UNIQUE (project_id, shot_number);

-- 删除函数
DROP FUNCTION IF EXISTS save_storyboard_with_history;
DROP FUNCTION IF EXISTS get_storyboard_history;
DROP FUNCTION IF EXISTS switch_to_storyboard_version;
```
