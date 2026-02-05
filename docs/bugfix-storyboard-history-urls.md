# Bug 修复：分镜图历史版本主图加载失败

## 问题描述

在重新生成分镜图后，出现以下现象：

- ✅ **历史版本缩略图能正常显示**（HISTORY VERSIONS 区域的 V1、V2 等）
- ❌ **主图加载失败**（对话框上方的大图显示为 "Shot 1" 占位符）
- ❌ **外层预览图加载失败**（Storyboard 列表中的预览图）

## 根本原因

### 1. URL 解析逻辑

主图和外层预览都使用 `resolveStoryboardSrc()` 函数来解析图片 URL：

```typescript
function resolveStoryboardSrc(storyboard?: Storyboard): string | undefined {
  const stableUrl = storyboard.cdn_url || storyboard.image_url
  const externalUrl = storyboard.image_url_external

  const proxiedExternalUrl = externalUrl
    ? `/api/video-agent/proxy-image?u=${encodeURIComponent(externalUrl)}`
    : undefined

  // 关键逻辑：storage_status 为 'pending' 时优先用代理的 external URL
  const preferred = storyboard.storage_status === 'pending'
    ? (proxiedExternalUrl || stableUrl)
    : (stableUrl || proxiedExternalUrl)

  return preferred
}
```

### 2. 数据库函数缺失字段

`save_storyboard_with_history()` 函数在创建新版本时，只保存了这些字段：

```sql
INSERT INTO project_storyboards (
  project_id,
  shot_number,
  image_url,           -- ✅ 保存了
  image_storage_path,  -- ✅ 保存了
  seedream_task_id,    -- ✅ 保存了
  version,
  is_current,
  status,
  generation_attempts
)
```

但**缺少**：
- ❌ `image_url_external`（外部原始 URL）
- ❌ `storage_status`（存储状态，pending/completed/failed）

### 3. 为什么缩略图能显示

历史版本轮播组件直接使用 `version.image_url`：

```tsx
<img
  src={version.image_url}  // 直接使用，不走 resolveStoryboardSrc
  alt={`Version ${version.version}`}
/>
```

所以缩略图能正常显示，但主图和预览图不行。

## 修复方案

### 1. 数据库迁移

修改 `save_storyboard_with_history()` 函数，增加两个参数：

```sql
CREATE OR REPLACE FUNCTION save_storyboard_with_history(
  p_project_id UUID,
  p_shot_number INT,
  p_image_url TEXT,
  p_image_storage_path TEXT DEFAULT NULL,
  p_seedream_task_id VARCHAR(100) DEFAULT NULL,
  p_image_url_external TEXT DEFAULT NULL,      -- 🔥 新增
  p_storage_status TEXT DEFAULT 'pending'      -- 🔥 新增
)
RETURNS UUID AS $$
...
INSERT INTO project_storyboards (
  ...
  image_url_external,   -- 🔥 保存外部 URL
  storage_status,       -- 🔥 保存存储状态
  ...
)
VALUES (
  ...
  p_image_url_external,
  p_storage_status,
  ...
)
...
```

### 2. API 调用更新

在 `regenerate/route.ts` 中调用时传递新参数：

```typescript
const { data: newVersionId, error: saveError } = await supabaseAdmin
  .rpc('save_storyboard_with_history', {
    p_project_id: projectId,
    p_shot_number: shotNumber,
    p_image_url: result.image_url,
    p_image_storage_path: null,
    p_seedream_task_id: null,
    p_image_url_external: result.image_url,  // 🔥 新增
    p_storage_status: 'pending'              // 🔥 新增
  })
```

## 部署步骤

### 1. 执行数据库迁移

```bash
cd /Users/jacob/Desktop/vidfab
./scripts/fix-storyboard-history-urls.sh
```

或手动执行：

```bash
psql $SUPABASE_DB_URL -f lib/database/migrations/fix-storyboard-history-urls.sql
```

### 2. 重启应用

代码已经修改完成，执行迁移后重启应用即可。

### 3. 验证修复

1. 打开一个项目
2. 重新生成一张分镜图
3. 检查以下位置是否都能正常显示：
   - ✅ 编辑对话框中的主图
   - ✅ 历史版本缩略图
   - ✅ Storyboard 列表中的预览图

## 技术细节

### resolveStoryboardSrc 的完整逻辑

```typescript
// 1. 获取稳定 URL（CDN 或本地存储）
const stableUrl = storyboard.cdn_url || storyboard.image_url

// 2. 获取外部 URL（seedream 的签名 URL）
const externalUrl = storyboard.image_url_external

// 3. 代理外部 URL（防止签名过期）
const proxiedExternalUrl = externalUrl
  ? `/api/video-agent/proxy-image?u=${encodeURIComponent(externalUrl)}`
  : undefined

// 4. 根据存储状态选择 URL
// - pending: 下载未完成，用代理的外部 URL（快速预览）
// - completed: 下载完成，用稳定 URL（可靠）
const preferred = storyboard.storage_status === 'pending'
  ? (proxiedExternalUrl || stableUrl)
  : (stableUrl || proxiedExternalUrl)

// 5. 添加时间戳防止缓存
if (storyboard.updated_at) {
  const separator = preferred.includes('?') ? '&' : '?'
  return `${preferred}${separator}t=${encodeURIComponent(storyboard.updated_at)}`
}

return preferred
```

### 为什么需要 image_url_external

1. **快速预览**：seedream 生成的图片最初只有外部 URL，需要异步下载到 CDN
2. **防止签名过期**：通过代理服务器访问，避免浏览器直接请求时签名失效
3. **无缝切换**：下载完成后自动切换到稳定的 CDN URL

### 为什么需要 storage_status

1. **决定使用哪个 URL**：pending 时用外部 URL，completed 时用 CDN URL
2. **优化用户体验**：pending 时可以快速显示预览，不用等下载完成
3. **状态追踪**：可以监控下载进度和失败情况

## 相关文件

- `lib/database/migrations/fix-storyboard-history-urls.sql` - 数据库迁移脚本
- `app/api/video-agent/projects/[id]/storyboards/[shotNumber]/regenerate/route.ts` - API 调用更新
- `app/studio/video-agent-beta/components/steps/Step1ScriptAnalysis/StoryboardEditDialog/StoryboardEditPanel.tsx` - 主图显示逻辑
- `app/studio/video-agent-beta/components/steps/Step1ScriptAnalysis/StoryboardSection/StoryboardCardEnhanced.tsx` - 预览图显示逻辑

## 时间线

- **2026-02-05**：发现 bug，分析根因，完成修复
