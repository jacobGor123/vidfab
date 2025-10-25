# 修复管理后台 Generation Type 显示问题

## 问题描述

管理后台 `/admin/tasks` 页面的任务列表中,**所有任务的 Generation Type 字段都显示为 "Text to Video"**,即使任务实际上是 "Image to Video" 或 "Video Effects"。

## 根因分析

### 数据格式不一致

**问题核心**: 数据库中保存的 `generationType` 使用**中划线命名**,但显示逻辑期望的是**下划线命名**。

### 数据流追踪

#### 1. 任务创建时 (前端 → API)

**位置**: `hooks/use-video-generation.tsx`

```typescript
// Text to Video (第 116 行)
settings: {
  generationType: 'text-to-video',  // ✅ 中划线格式
  ...
}

// Image to Video (第 210 行)
settings: {
  generationType: 'image-to-video',  // ✅ 中划线格式
  ...
}

// Video Effects (第 318 行)
settings: {
  generationType: 'video-effects',  // ✅ 中划线格式
  ...
}
```

#### 2. 存储到数据库 (API → Database)

**位置**: `app/api/video/store/route.ts` 第 107-125 行

```typescript
const newVideo = await UserVideosDB.createVideo(userId, {
  wavespeedRequestId,
  prompt: settings.prompt || 'Generated video',
  settings: {
    model: settings.model,
    duration: settings.duration,
    resolution: settings.resolution,
    aspectRatio: settings.aspectRatio,
    style: settings.style,
    image_url: settings.image_url || settings.imageUrl || settings.image || null,
    effectId: settings.effectId || null,
    effectName: settings.effectName || null,
    generationType: settings.generationType || null  // ⚠️ 保存为中划线格式
  },
  originalUrl
}, userEmail)
```

**数据库中的实际值**:
```json
{
  "settings": {
    "generationType": "image-to-video"  // 中划线格式
  }
}
```

#### 3. 管理后台读取 (Database → 前端)

**位置**: `lib/admin/all-tasks-fetcher.ts` 第 20-38 行 (修复前)

```typescript
function determineGenerationType(settings: any): GenerationType {
  // 优先使用显式的 generationType 字段
  if (settings?.generationType) {
    return settings.generationType;
    // ❌ 问题: 直接返回 'image-to-video' (中划线)
    // ✅ 期望: 返回 'image_to_video' (下划线)
  }

  // 后续判断逻辑...
}
```

**类型定义**: `types/admin/tasks.ts`

```typescript
export type GenerationType =
  | 'text_to_video'      // 下划线格式
  | 'image_to_video'     // 下划线格式
  | 'video_effects';     // 下划线格式
```

#### 4. 前端显示逻辑

**位置**: `components/admin/tasks-list-with-pagination.tsx` 第 84-101 行

```typescript
switch (item.generation_type) {
  case 'image_to_video':         // ✅ 期望下划线格式
    color = 'bg-purple-100 ...';
    icon = '🖼️';
    label = 'Image to Video';
    break;
  case 'video_effects':          // ✅ 期望下划线格式
    color = 'bg-pink-100 ...';
    icon = '✨';
    label = 'Video Effects';
    break;
  case 'text_to_video':          // ✅ 期望下划线格式
  default:
    color = 'bg-blue-100 ...';
    icon = '✍️';
    label = 'Text to Video';
    break;
}
```

### 问题总结

```
保存格式 (中划线)         期望格式 (下划线)        结果
─────────────────────    ─────────────────────   ──────────────
'image-to-video'    →    'image_to_video'   →   ❌ 不匹配 → default
'video-effects'     →    'video_effects'    →   ❌ 不匹配 → default
'text-to-video'     →    'text_to_video'    →   ❌ 不匹配 → default

所有不匹配的值都进入 default 分支 → 显示为 'Text to Video'
```

---

## 修复方案

### 方案选择

**选项 1**: 修改数据库中的数据格式 (中划线 → 下划线)
- ❌ 需要数据迁移
- ❌ 影响现有数据
- ❌ 风险高

**选项 2**: 修改显示逻辑,兼容中划线格式
- ✅ 无需修改数据库
- ✅ 向后兼容
- ✅ 风险低
- ✅ **采用此方案**

### 实现方案

在 `determineGenerationType` 函数中添加格式转换:

**位置**: `lib/admin/all-tasks-fetcher.ts` 第 20-46 行

```typescript
function determineGenerationType(settings: any): GenerationType {
  // 优先使用显式的 generationType 字段
  if (settings?.generationType) {
    // 🔥 修复:转换中划线格式为下划线格式
    const type = settings.generationType;
    if (type === 'image-to-video') return 'image_to_video';
    if (type === 'video-effects') return 'video_effects';
    if (type === 'text-to-video') return 'text_to_video';
    // 如果已经是下划线格式,直接返回
    if (type === 'image_to_video' || type === 'video_effects' || type === 'text_to_video') {
      return type;
    }
  }

  // 判断是否为 video-effects（通过 effectId 或 model）
  if (settings?.effectId || settings?.effectName || settings?.model === 'video-effects') {
    return 'video_effects';
  }

  // 判断是否为 image_to_video（通过 image_url）
  if (settings?.image_url || settings?.imageUrl || settings?.inputImage) {
    return 'image_to_video';
  }

  // 默认为 text_to_video
  return 'text_to_video';
}
```

### 兼容性

修复后同时支持两种格式:

| 输入格式 (数据库) | 输出格式 (显示) | 结果 |
|------------------|----------------|------|
| `'image-to-video'` | `'image_to_video'` | ✅ 正确 |
| `'image_to_video'` | `'image_to_video'` | ✅ 正确 |
| `'video-effects'` | `'video_effects'` | ✅ 正确 |
| `'video_effects'` | `'video_effects'` | ✅ 正确 |
| `'text-to-video'` | `'text_to_video'` | ✅ 正确 |
| `'text_to_video'` | `'text_to_video'` | ✅ 正确 |

---

## 修复效果

### 修复前

| Task | settings.generationType | 显示结果 |
|------|------------------------|----------|
| Image to Video | `'image-to-video'` | ❌ Text to Video |
| Video Effects | `'video-effects'` | ❌ Text to Video |
| Text to Video | `'text-to-video'` | ✅ Text to Video |

### 修复后

| Task | settings.generationType | 显示结果 |
|------|------------------------|----------|
| Image to Video | `'image-to-video'` | ✅ Image to Video (🖼️) |
| Video Effects | `'video-effects'` | ✅ Video Effects (✨) |
| Text to Video | `'text-to-video'` | ✅ Text to Video (✍️) |

---

## 测试验证

### 手动测试

1. **访问管理后台**:
   ```
   /admin/tasks
   ```

2. **检查任务列表**:
   - Image to Video 任务应显示紫色标签 🖼️ "Image to Video"
   - Video Effects 任务应显示粉色标签 ✨ "Video Effects"
   - Text to Video 任务应显示蓝色标签 ✍️ "Text to Video"

### 数据验证

**查询数据库**:

```sql
SELECT
  id,
  prompt,
  settings->>'generationType' as generation_type,
  created_at
FROM user_videos
ORDER BY created_at DESC
LIMIT 10;
```

**预期结果**:

```
id                                   | prompt              | generation_type    | created_at
-------------------------------------|---------------------|--------------------|-----------
xxx-xxx-xxx                          | Beautiful landscape | text-to-video      | 2025-...
xxx-xxx-xxx                          | Convert image       | image-to-video     | 2025-...
xxx-xxx-xxx                          | Pixelate Effect     | video-effects      | 2025-...
```

---

## 后续优化建议

### 优化 1: 统一数据格式

**长期方案**: 在新数据写入时统一使用下划线格式

**位置**: `app/api/video/store/route.ts` 第 122 行

```typescript
// 修改前
generationType: settings.generationType || null

// 修改后
generationType: normalizeGenerationType(settings.generationType) || null

// 辅助函数
function normalizeGenerationType(type: string | null): string | null {
  if (!type) return null;
  // 转换为下划线格式
  return type.replace(/-/g, '_');
}
```

**优点**:
- 数据格式统一
- 简化查询逻辑
- 避免格式转换开销

**缺点**:
- 需要修改写入逻辑
- 历史数据仍为中划线格式
- 需要数据迁移脚本

### 优化 2: 添加数据验证

在 API 层添加 `generationType` 验证:

```typescript
function validateGenerationType(type: string): boolean {
  const validTypes = ['text-to-video', 'image-to-video', 'video-effects'];
  return validTypes.includes(type);
}
```

### 优化 3: 添加监控日志

记录格式转换统计:

```typescript
if (settings?.generationType) {
  const type = settings.generationType;
  if (type.includes('-')) {
    console.log(`[GenerationType] Converting hyphen format: ${type}`);
  }
  // ... 转换逻辑
}
```

---

## 影响范围

### 修改文件

- ✅ `lib/admin/all-tasks-fetcher.ts` (1 个函数,约 15 行代码)

### 受影响功能

- ✅ 管理后台任务列表显示
- ✅ 任务类型筛选 (如果实现)
- ✅ 任务统计 (按类型分组)

### 不受影响

- ✅ 前端任务创建流程
- ✅ 数据库存储逻辑
- ✅ 视频生成 API
- ✅ 用户视频列表

---

## 总结

### 问题

管理后台任务列表的 Generation Type 字段全部显示为 "Text to Video",因为:
- 数据库保存的是中划线格式 (`image-to-video`)
- 显示逻辑期望的是下划线格式 (`image_to_video`)
- 格式不匹配导致所有任务都进入 default 分支

### 修复

在 `determineGenerationType` 函数中添加格式转换逻辑:
- 检测中划线格式并转换为下划线格式
- 同时支持两种格式,确保向后兼容
- 无需修改数据库或数据迁移

### 效果

- ✅ 所有任务类型正确显示
- ✅ 完全向后兼容
- ✅ 无破坏性变更
- ✅ Build 成功,无编译错误
