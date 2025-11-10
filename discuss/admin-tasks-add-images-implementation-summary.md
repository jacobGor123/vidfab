# /admin/tasks 添加 AI Images 数据 - 实施总结

## ✅ 实施完成！

已成功为 `/admin/tasks` 页面添加 AI Images 数据支持，现在可以显示 **5 种任务类型**。

---

## 📋 修改清单

### 1️⃣ **类型定义** - `types/admin/tasks.d.ts`

#### 修改内容：
- ✅ `TaskType`: 添加 `'image_generation'` 类型
- ✅ `TaskStatus`: 添加 `'uploading'` 状态（图片任务特有）
- ✅ `GenerationType`: 添加 `'text_to_image'` 和 `'image_to_image'` 类型
- ✅ `UnifiedTask`: 添加图片特有字段：
  - `image_url?: string | null` - 图片结果 URL
  - `width?: number | null` - 图片宽度
  - `height?: number | null` - 图片高度
  - `upload_source?: 'file' | 'url' | null` - 上传来源
  - `source_images?: any | null` - image_to_image 的源图片

```typescript
// 修改后的类型
export type TaskType = 'video_generation' | 'image_generation';

export type GenerationType =
  | 'text_to_video'
  | 'image_to_video'
  | 'video_effects'
  | 'text_to_image'    // 🆕
  | 'image_to_image';  // 🆕
```

---

### 2️⃣ **数据获取逻辑** - `lib/admin/all-tasks-fetcher.ts`

#### 新增函数：
- ✅ `normalizeImageTask()` - 将 user_images 表数据标准化为 UnifiedTask
- ✅ `fetchImageTasks()` - 从 user_images 表获取图片任务
- ✅ `fetchVideoStats()` - 获取视频任务统计（拆分自原 fetchTaskStats）
- ✅ `fetchImageStats()` - 获取图片任务统计

#### 修改函数：
- ✅ `fetchAllTasks()` - 重构为支持合并视频和图片任务
  - `taskType === 'video_generation'` → 只返回视频任务
  - `taskType === 'image_generation'` → 只返回图片任务
  - `taskType === undefined` → 合并所有任务并按时间排序

- ✅ `fetchTaskStats()` - 重构为支持分别统计或合并统计
  - 处理图片任务的 `'uploading'` 状态
  - 处理视频任务的 `'generating'`, `'downloading'`, `'processing'` 状态

- ✅ `getTaskTypeLabel()` - 添加 `'image_generation': 'Image Generation'`

#### 关键逻辑：
```typescript
// 图片任务标准化示例
function normalizeImageTask(rawTask: any): UnifiedTask {
  return {
    id: rawTask.id,
    task_type: 'image_generation',  // 🆕
    generation_type: rawTask.generation_type,  // 直接从表字段获取
    image_url: rawTask.storage_url,  // 🆕 图片的存储 URL
    video_url: null,  // 图片任务没有视频
    width: rawTask.width,  // 🆕
    height: rawTask.height,  // 🆕
    // ... 其他字段
  };
}
```

---

### 3️⃣ **前端列表组件** - `components/admin/tasks-list-with-pagination.tsx`

#### 修改的列：

##### **Generation Type 列**
添加图片类型的显示：
- ✅ `text_to_image` → 🎨 橙色 "Text to Image"
- ✅ `image_to_image` → 🖌️ 青色 "Image to Image"

##### **Parameters 列**
添加图片任务参数显示逻辑：
```typescript
if (item.task_type === 'image_generation') {
  // 显示宽高：1024 × 1024
  // 显示比例：1:1
} else {
  // 显示时长：5s
  // 显示分辨率：720p
  // 显示比例：16:9
}
```

##### **Result 列**
添加图片结果显示逻辑：
```typescript
if (item.task_type === 'image_generation' && item.image_url) {
  return <MediaPreview src={item.image_url} type="image" ... />;
}
// 否则显示视频或音频
```

---

### 4️⃣ **任务类型过滤器** - `components/admin/task-type-filter.tsx`

#### 修改内容：
- ✅ 移除未使用的任务类型（`audio_generation`, `watermark_removal` 等）
- ✅ 保留实际使用的类型：
  - `'all'` - 全部任务
  - `'video_generation'` - 视频生成
  - `'image_generation'` - 图片生成（🆕）

- ✅ 添加颜色配置：
  - `image_generation` → 橙色

---

## 🎯 最终效果

### 现在支持的 5 种任务类型

| 序号 | 任务类型 | TaskType | GenerationType | 图标 | 颜色 | 数据来源 |
|------|----------|----------|----------------|------|------|----------|
| 1 | Text to Video | `video_generation` | `text_to_video` | ✍️ | 蓝色 | user_videos |
| 2 | Image to Video | `video_generation` | `image_to_video` | 🖼️ | 紫色 | user_videos |
| 3 | Video Effects | `video_generation` | `video_effects` | ✨ | 粉色 | user_videos |
| 4 | **Text to Image** | `image_generation` | `text_to_image` | 🎨 | **橙色** | **user_images** |
| 5 | **Image to Image** | `image_generation` | `image_to_image` | 🖌️ | **青色** | **user_images** |

### 过滤器选项

- **All Tasks** - 显示所有任务（视频 + 图片，合并排序）
- **Video Generation** - 只显示视频任务（3 种类型）
- **Image Generation** - 只显示图片任务（2 种类型）

---

## 📊 数据表字段映射

### user_videos → UnifiedTask

| 表字段 | UnifiedTask 字段 | 说明 |
|--------|------------------|------|
| `id` | `id` | UUID |
| `user_id` | `user_id` | 用户 ID |
| `prompt` | `prompt` | 提示词 |
| `status` | `status` | 状态 |
| `original_url` | `video_url` | 视频 URL |
| `storage_path` | `storage_path` | 存储路径 |
| `thumbnail_path` | `thumbnail_path` | 缩略图路径 |
| `settings.generationType` | `generation_type` | 生成类型 |
| `settings.image_url` | `input_image_url` | 输入图片 |
| `settings.model` | `model` | 模型 |
| `settings.resolution` | `resolution` | 分辨率 (如 "720p") |
| `settings.aspectRatio` | `aspectRatio` | 比例 |
| `settings.duration` | `durationStr` | 时长 (如 "5s") |

### user_images → UnifiedTask

| 表字段 | UnifiedTask 字段 | 说明 |
|--------|------------------|------|
| `id` | `id` | UUID |
| `user_id` | `user_id` | 用户 ID |
| `prompt` | `prompt` | 提示词 |
| `status` | `status` | 状态 |
| `storage_url` | `image_url` | **图片 URL** |
| `storage_path` | `storage_path` | 存储路径 |
| `generation_type` | `generation_type` | **生成类型（表字段）** |
| `source_images` | `input_image_url` | 输入图片 |
| `model` | `model` | **模型（表字段）** |
| `width` | `width` | **图片宽度** |
| `height` | `height` | **图片高度** |
| `aspect_ratio` | `aspectRatio` | 比例 |
| `upload_source` | `upload_source` | **上传来源** |

---

## ⚠️ 关键差异处理

### 1. 状态值差异

```typescript
// user_videos.status
'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted'

// user_images.status
'uploading' | 'processing' | 'completed' | 'failed' | 'deleted'
```

**统计处理：**
- 视频 `processing` = `generating` + `downloading` + `processing`
- 图片 `processing` = `uploading` + `processing`

### 2. 结果 URL 差异

```typescript
// 视频任务
video_url: item.original_url  // 视频结果

// 图片任务
image_url: item.storage_url   // 图片结果
video_url: null               // 图片没有视频
```

### 3. 参数字段差异

| 参数类型 | 视频任务 | 图片任务 |
|----------|----------|----------|
| 尺寸 | `resolution` (如 "720p") | `width` × `height` (像素) |
| 时长 | `durationStr` (如 "5s") | - |
| 比例 | `aspectRatio` | `aspectRatio` |

---

## 🔄 数据流架构

```
用户访问 /admin/tasks?type=image_generation
          ↓
┌─────────────────────────────────────┐
│ TasksPage (server component)        │
├─────────────────────────────────────┤
│ fetchAllTasks({ taskType })         │
│ fetchTaskStats(taskType)            │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ fetchImageTasks()                   │
├─────────────────────────────────────┤
│ • 查询 user_images 表              │
│ • JOIN users 表获取 email          │
│ • 应用邮箱过滤                     │
│ • 应用游标分页                     │
│ • normalizeImageTask() 标准化      │
└─────────────────────────────────────┘
          ↓
┌─────────────────────────────────────┐
│ TasksListWithPagination (client)    │
├─────────────────────────────────────┤
│ • 显示图片任务                     │
│ • 图片预览和全屏查看               │
│ • 无限滚动加载更多                 │
│ • 邮箱过滤                         │
└─────────────────────────────────────┘
```

---

## 📁 修改的文件清单

| 文件 | 修改内容 | 状态 |
|------|----------|------|
| `types/admin/tasks.d.ts` | 添加图片类型和字段 | ✅ 已完成 |
| `lib/admin/all-tasks-fetcher.ts` | 添加图片数据获取逻辑 | ✅ 已完成 |
| `components/admin/tasks-list-with-pagination.tsx` | 更新 UI 显示逻辑 | ✅ 已完成 |
| `components/admin/task-type-filter.tsx` | 添加过滤器选项 | ✅ 已完成 |

---

## 🧪 测试清单

建议进行以下测试：

- [ ] 访问 `/admin/tasks` 能否正常显示所有任务（视频 + 图片合并）
- [ ] 点击 "Image Generation" 过滤器，能否只显示图片任务
- [ ] Text to Image 任务是否正确显示为 🎨 橙色
- [ ] Image to Image 任务是否正确显示为 🖌️ 青色
- [ ] 图片结果能否正常预览和全屏查看
- [ ] 图片任务的参数列是否显示宽高（如 1024 × 1024）
- [ ] 邮箱过滤是否对图片任务生效
- [ ] Load More 按钮是否正常工作
- [ ] 统计数据（Total / Completed / Failed / Processing）是否准确
- [ ] 切换 All / Video / Image 过滤器是否流畅

---

## 🎉 下一步建议

1. **性能优化**（如果数据量很大）：
   - 考虑添加缓存机制
   - 优化合并查询的性能
   - 添加索引优化

2. **功能增强**：
   - 添加批量操作（删除、重新生成等）
   - 添加导出功能
   - 添加更详细的筛选条件（按日期、状态等）

3. **UI 改进**：
   - 添加加载骨架屏
   - 优化移动端显示
   - 添加任务详情弹窗

---

**实施完成时间**: 2025-11-10
**实施者**: Claude Code
**状态**: ✅ 完成并可供测试
