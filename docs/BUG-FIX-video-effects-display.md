# Bug 修复：管理后台无法区分任务类型（Image-to-Video 和 Video-Effects）

**修复日期**: 2025-10-25
**严重性**: 中等
**影响范围**: 管理后台 Tasks 表格

---

## 🐛 问题描述

管理后台的 Tasks 表格**无法区分不同的任务类型**：
1. ❌ 无法显示 **image-to-video** 任务的输入图片
2. ❌ 无法识别 **video-effects** 任务
3. ❌ 所有任务都被错误地标记为 **text_to_video**

---

## 🔍 问题分析

### 调查结果

**数据库检查**：
- 📊 239 条任务记录
- ❌ **0 条**包含 `image_url` 字段
- ❌ **0 条**包含 `effectId`/`effectName` 字段
- ⚠️ `settings` 字段仅包含：`model`, `style`, `duration`, `resolution`, `aspectRatio`

### 根本原因

**数据保存流程中关键信息丢失**：

1. `/hooks/use-video-polling.ts:74-95`
   - VideoJob 包含 `sourceImage`、`effectId`、`effectName` 字段
   - 但调用 `/api/video/store` 时**未传递**这些字段

2. `/app/api/video/store/route.ts:110-125`
   - API 接收 settings 后
   - 保存时**未包含**关键字段：
     - ❌ `image_url` (image-to-video)
     - ❌ `effectId` / `effectName` (video-effects)
     - ❌ `generationType` (任务类型标识)

---

## ✅ 修复方案

### 修复 1: `/app/api/video/store/route.ts`

**位置**: 第 110-125 行

**修复前**:
```typescript
settings: {
  model: settings.model,
  duration: settings.duration,
  resolution: settings.resolution,
  aspectRatio: settings.aspectRatio,
  style: settings.style
}
```

**修复后**:
```typescript
settings: {
  model: settings.model,
  duration: settings.duration,
  resolution: settings.resolution,
  aspectRatio: settings.aspectRatio,
  style: settings.style,
  // 🔥 保存图片 URL（如果是 image-to-video）
  image_url: settings.image_url || settings.imageUrl || settings.image || null,
  // 🔥 保存特效信息（如果是 video-effects）
  effectId: settings.effectId || null,
  effectName: settings.effectName || null,
  // 🔥 保存生成类型
  generationType: settings.generationType || null
}
```

---

### 修复 2: `/hooks/use-video-polling.ts`

**位置**: 第 74-95 行

**修复前**:
```typescript
settings: {
  ...job.settings,
  prompt: job.prompt
}
```

**修复后**:
```typescript
settings: {
  ...job.settings,
  prompt: job.prompt,
  // 🔥 传递图片 URL（image-to-video）
  image_url: job.sourceImage || job.settings.image_url || job.settings.image || null,
  // 🔥 传递特效信息（video-effects）
  effectId: job.effectId || job.settings.effectId || null,
  effectName: job.effectName || job.settings.effectName || null,
  // 🔥 传递生成类型
  generationType: job.generationType || job.settings.generationType || null
}
```

---

### 修复 3: `/lib/admin/all-tasks-fetcher.ts`

**增强任务类型判断逻辑**:

```typescript
function determineGenerationType(settings: any): GenerationType {
  // 优先使用显式的 generationType 字段
  if (settings?.generationType) {
    return settings.generationType;
  }

  // 判断是否为 video-effects
  if (settings?.effectId || settings?.effectName || settings?.model === 'video-effects') {
    return 'video_effects';
  }

  // 判断是否为 image_to_video
  if (settings?.image_url || settings?.imageUrl || settings?.inputImage) {
    return 'image_to_video';
  }

  // 默认为 text_to_video
  return 'text_to_video';
}
```

---

### 修复 4: `/types/admin/tasks.d.ts`

**新增 GenerationType**:
```typescript
export type GenerationType = 'text_to_video' | 'image_to_video' | 'video_effects';
```

**新增 UnifiedTask 字段**:
```typescript
// Video Effects 特有字段
effectId: string | null;
effectName: string | null;
```

---

### 修复 5: `/components/admin/tasks-list-with-pagination.tsx`

**Generation Type 列支持 3 种类型**:
- ✍️ **Text to Video** (蓝色)
- 🖼️ **Image to Video** (紫色)
- ✨ **Video Effects** (粉色)

**Prompt / Effect 列智能显示**:
- 普通任务：显示 Prompt
- Video Effects：显示特效名称（✨ Effect Name）

---

## 🎯 修复后的功能

### 1. Text to Video (text_to_video)
- ✍️ 蓝色标签："Text to Video"
- 显示：Prompt 内容
- 输入图片：-（无）

### 2. Image to Video (image_to_video)
- 🖼️ 紫色标签："Image to Video"
- 显示：Prompt 内容
- 输入图片：✅ **显示图片缩略图**

### 3. Video Effects (video_effects)
- ✨ 粉色标签："Video Effects"
- 显示：**✨ 特效名称**（如 "3D Zoom"）
- 输入图片：✅ **显示输入图片**

---

## 📊 数据库字段说明

修复后，`user_videos.settings` 将包含以下字段：

### 所有任务共有
- `model` - 使用的模型
- `duration` - 视频时长
- `resolution` - 分辨率
- `aspectRatio` - 宽高比
- `style` - 风格（可选）
- `generationType` - **任务类型**（新增）

### Image-to-Video 特有
- `image_url` - **输入图片 URL**（新增）

### Video-Effects 特有
- `effectId` - **特效 ID**（新增）
- `effectName` - **特效名称**（新增）

---

## 🧪 测试验证

### 测试 Image-to-Video
1. 访问 `/image-to-video`
2. 上传图片 → 输入 Prompt → 生成
3. 检查管理后台 `/admin/tasks`：
   - ✅ Generation Type = "🖼️ Image to Video"
   - ✅ Input Image 显示缩略图
   - ✅ Prompt 显示文本

### 测试 Video-Effects
1. 访问视频特效页面
2. 上传图片 → 选择特效 → 生成
3. 检查管理后台 `/admin/tasks`：
   - ✅ Generation Type = "✨ Video Effects"
   - ✅ Input Image 显示缩略图
   - ✅ Prompt/Effect 列显示 "✨ 特效名称"

### 测试 Text-to-Video
1. 访问 `/create` 或首页
2. 输入 Prompt → 生成
3. 检查管理后台 `/admin/tasks`：
   - ✅ Generation Type = "✍️ Text to Video"
   - ✅ Input Image = -（无）
   - ✅ Prompt 显示文本

---

## ⚠️ 历史数据

**已有的 239 条记录**：
- ❌ 无法自动修复（settings 中没有保存关键字段）
- ℹ️ 仍然会显示为 text_to_video
- ℹ️ 不影响新任务的正确显示

**建议**：
- 可以在数据库中手动标注历史数据（可选）
- 或者接受历史数据的限制，仅关注未来任务

---

## 📝 相关文件

### 已修改
- `/app/api/video/store/route.ts`
- `/hooks/use-video-polling.ts`
- `/lib/admin/all-tasks-fetcher.ts`
- `/types/admin/tasks.d.ts`
- `/components/admin/tasks-list-with-pagination.tsx`

### 相关功能
- Image-to-Video 生成
- Video-Effects 生成
- 管理后台任务列表

---

## ✅ 修复确认

- [x] 代码修改完成
- [x] 支持 3 种任务类型区分
- [x] Image-to-Video 显示输入图片
- [x] Video-Effects 显示特效名称
- [x] 类型定义更新
- [x] 向后兼容
- [ ] 需要用户测试（创建新任务验证）

---

## 🎯 总结

**问题**：管理后台无法区分任务类型，关键信息丢失
**根源**：数据保存流程中未传递和存储关键字段
**修复**：完整保存 `image_url`、`effectId`、`effectName`、`generationType`
**效果**：管理后台可以清晰区分 3 种任务类型并显示相应信息
