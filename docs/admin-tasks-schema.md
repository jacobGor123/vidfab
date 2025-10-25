# 管理后台 Tasks 数据表架构文档

## 概述

管理后台的所有任务数据都存储在 **`user_videos`** 表中。

之前版本曾计划使用多个独立的任务表（`video_generation_tasks`、`audio_generation_tasks` 等），但实际实现中并未使用这些表。为简化架构，已将这些空表删除。

---

## `user_videos` 表结构

### 核心标识字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `id` | UUID | PRIMARY KEY | 主键，自动生成 |
| `user_id` | UUID | NOT NULL, FK(auth.users) | 用户 ID，外键关联 auth.users |

### 生成信息字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `wavespeed_request_id` | VARCHAR | UNIQUE NOT NULL | Wavespeed 任务 ID（唯一） |
| `prompt` | TEXT | NOT NULL | 用户输入的提示词 |
| `settings` | JSONB | NOT NULL | 生成设置：`{model, duration, resolution, aspectRatio, style, image_url}` |

**settings 字段说明：**
- 如果包含 `image_url`/`imageUrl`/`inputImage` 字段，则为 **image_to_video** 类型
- 否则为 **text_to_video** 类型

### 文件存储字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `original_url` | VARCHAR | NULLABLE | Wavespeed 临时 URL |
| `storage_path` | VARCHAR | NULLABLE | Supabase 存储路径：`videos/{user_id}/{video_id}.mp4` |
| `thumbnail_path` | VARCHAR | NULLABLE | 缩略图路径：`thumbnails/{user_id}/{video_id}.jpg` |

### 文件元数据字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `file_size` | BIGINT | NULLABLE | 文件大小（字节） |
| `duration_seconds` | INTEGER | NULLABLE | 视频时长（秒） |
| `video_resolution` | VARCHAR | NULLABLE | 视频分辨率 |
| `aspect_ratio` | VARCHAR | NULLABLE | 宽高比 |

### 状态管理字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `status` | VARCHAR | NOT NULL, CHECK | 任务状态，可选值见下表 |
| `error_message` | TEXT | NULLABLE | 错误信息 |
| `download_progress` | INTEGER | DEFAULT 0, CHECK (0-100) | 下载进度 |

**status 可选值：**
- `generating` - Wavespeed 生成中
- `downloading` - 下载到 Supabase 存储中
- `processing` - 生成缩略图/后处理
- `completed` - 完成
- `failed` - 失败
- `deleted` - 软删除

### 用户交互字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `is_favorite` | BOOLEAN | DEFAULT FALSE | 是否收藏 |
| `view_count` | INTEGER | DEFAULT 0 | 观看次数 |
| `last_viewed_at` | TIMESTAMP | NULLABLE | 最后观看时间 |

### 时间戳字段

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|------|------|
| `created_at` | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | 更新时间（自动触发器更新） |

---

## 管理后台展示字段

管理后台的 Tasks 表格展示以下关键信息：

1. **Generation Type** - 生成类型
   - 🖼️ Image to Video - 从图片生成视频
   - ✍️ Text to Video - 从文本生成视频
   - 判断逻辑：`settings.image_url` 存在则为 Image to Video

2. **User** - 用户信息
   - 用户邮箱
   - 用户 ID 前 8 位

3. **Input Image** - 输入图片
   - 如果是 Image to Video，显示输入图片预览
   - 从 `settings.image_url` / `settings.imageUrl` / `settings.inputImage` 获取

4. **Prompt** - 提示词
   - 显示用户输入的文本提示
   - 超过 50 字符显示 tooltip

5. **Result** - 生成结果
   - 显示视频预览（如果有）
   - 从 `original_url` 获取

6. **Status** - 状态
   - 不同状态用不同颜色标识
   - 显示进度条（如果 0 < progress < 100）

7. **Model** - 使用的模型
   - 从 `settings.model` 获取

8. **Created** - 创建时间
   - 格式化显示日期和时间

9. **Error** - 错误信息
   - 如果失败，显示错误详情

---

## 相关文件

### 后端逻辑
- `lib/admin/all-tasks-fetcher.ts` - 任务获取和标准化逻辑
- `app/api/admin/tasks/route.ts` - Tasks API 端点

### 类型定义
- `types/admin/tasks.d.ts` - TypeScript 类型定义

### 前端组件
- `components/admin/tasks-list-with-pagination.tsx` - 任务列表组件
- `components/admin/media-preview.tsx` - 媒体预览组件

### 数据库脚本
- `scripts/init-database.sql` - 数据库初始化脚本（创建 user_videos 表）
- `scripts/cleanup-empty-task-tables.sql` - 清理未使用的任务表

---

## 索引

为优化查询性能，`user_videos` 表创建了以下索引：

```sql
CREATE INDEX idx_user_videos_user_id ON user_videos(user_id);
CREATE INDEX idx_user_videos_status ON user_videos(status);
CREATE INDEX idx_user_videos_created_at ON user_videos(created_at DESC);
CREATE INDEX idx_user_videos_wavespeed_id ON user_videos(wavespeed_request_id);
CREATE INDEX idx_user_videos_user_status ON user_videos(user_id, status);
CREATE INDEX idx_user_videos_user_created ON user_videos(user_id, created_at DESC);
CREATE INDEX idx_user_videos_user_favorite ON user_videos(user_id, is_favorite) WHERE is_favorite = true;
CREATE INDEX idx_user_videos_prompt_search ON user_videos USING gin(to_tsvector('english', prompt));
```

---

## 更新历史

- **2025-10-25**: 删除未使用的 6 个任务表，简化为仅使用 `user_videos` 表
- **2025-10-25**: 管理后台增加 Generation Type 和 Input Image 显示
