# Bug 修复：管理后台无法显示 Image-to-Video 的输入图片

**修复日期**: 2025-10-25
**严重性**: 中等
**影响范围**: 管理后台 Tasks 表格

---

## 🐛 问题描述

管理后台的 Tasks 表格中，**无法显示 image-to-video 任务的输入图片**，即使用户确实上传了图片。

### 症状
- 用户使用 image-to-video 功能时上传了图片
- 管理后台 Tasks 表格的 "Input Image" 列始终为空
- 所有任务都被识别为 text_to_video

---

## 🔍 问题分析

### 调查过程

1. **数据库检查**
   - 查询了 `user_videos` 表的所有 238 条记录
   - 发现所有记录的 `settings` 字段中**都不包含图片 URL**
   - `settings` 仅包含：`model`, `style`, `duration`, `resolution`, `aspectRatio`

2. **代码追踪**
   - API 接口 `/api/video/generate-image-to-video/route.ts` ✅ 正常
   - Wavespeed API 调用 `submitImageToVideoGeneration()` ✅ 正常
   - 问题出在 **数据保存** 环节 ❌

### 根本原因

在视频生成完成后，保存到数据库的流程中：

**问题代码位置**：
1. `/hooks/use-video-polling.ts:74-90` - 调用 `/api/video/store` 时**未传递图片 URL**
2. `/app/api/video/store/route.ts:110-118` - 保存 settings 时**未包含图片字段**

**数据流断裂**：
```
前端 (sourceImage) → VideoJob → 轮询保存 → ❌ 图片丢失 → 数据库
```

---

## ✅ 修复方案

### 修复 1: `/app/api/video/store/route.ts`

**位置**: 第 110-118 行

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
  image_url: settings.image_url || settings.imageUrl || settings.image || null
}
```

---

### 修复 2: `/hooks/use-video-polling.ts`

**位置**: 第 74-90 行

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
  // 🔥 传递图片 URL（如果是 image-to-video）
  image_url: job.sourceImage || job.settings.image_url || null
}
```

---

## 🎯 修复后的数据流

```
前端 (sourceImage) → VideoJob.sourceImage →
  轮询保存 (image_url) →
  API 保存 (settings.image_url) →
  数据库 (settings.image_url) →
  ✅ 管理后台显示
```

---

## 🧪 验证方法

### 1. 创建新的 image-to-video 任务
```bash
# 访问前端页面
/image-to-video

# 步骤:
1. 上传图片
2. 输入提示词
3. 点击生成
4. 等待完成
```

### 2. 检查管理后台
```bash
# 访问管理后台
/admin/tasks

# 验证:
1. Generation Type 列显示 "🖼️ Image to Video"
2. Input Image 列显示图片缩略图
3. 点击图片可以预览
```

### 3. 检查数据库
```sql
-- 查询最新的任务
SELECT
  id,
  prompt,
  settings->>'image_url' as image_url,
  created_at
FROM user_videos
ORDER BY created_at DESC
LIMIT 10;

-- 应该看到 image_url 有值（如果是 image-to-video）
```

---

## 📊 影响分析

### 受影响的功能
- ✅ 管理后台 Tasks 表格显示
- ✅ Generation Type 判断逻辑
- ✅ Input Image 预览功能

### 未受影响的功能
- ✅ 前端 image-to-video 生成功能（仍然正常工作）
- ✅ 视频生成质量（API 调用正常）
- ✅ 历史任务显示（只是缺少图片信息）

### 历史数据
- ⚠️ **已有的 238 条记录无法修复**（settings 中没有保存图片 URL）
- ✅ **未来的任务将正确显示**图片信息

---

## 🔄 后续建议

### 短期
1. ✅ 立即部署此修复
2. ⚠️ 通知用户历史任务无法显示图片（数据缺失）
3. ✅ 测试新创建的 image-to-video 任务

### 长期
1. **数据完整性检查**
   - 添加数据验证中间件
   - 确保关键字段不会丢失

2. **类型安全**
   - 完善 TypeScript 类型定义
   - 使用严格的类型检查

3. **监控**
   - 添加日志记录图片 URL 保存情况
   - 监控 image-to-video 任务比例

---

## 📝 相关文件

### 已修改
- `/app/api/video/store/route.ts`
- `/hooks/use-video-polling.ts`

### 相关文件
- `/lib/admin/all-tasks-fetcher.ts` - 判断 generation_type 的逻辑
- `/types/admin/tasks.d.ts` - 任务类型定义
- `/components/admin/tasks-list-with-pagination.tsx` - 管理后台表格组件

---

## ✅ 修复确认

- [x] 代码修改完成
- [x] 向后兼容（不影响历史数据）
- [x] 类型定义正确
- [x] 文档更新
- [ ] 需要用户测试（创建新的 image-to-video 任务）

---

## 🎯 总结

**问题根源**: 数据保存流程中图片 URL 丢失
**修复方法**: 在保存时传递并存储图片 URL
**影响范围**: 仅影响管理后台显示，不影响核心功能
**后续任务**: 所有新任务将正确显示图片
