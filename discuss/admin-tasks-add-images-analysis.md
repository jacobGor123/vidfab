# /admin/tasks 添加 AI Images 数据 - 需求梳理文档

## 📋 当前架构分析

### 当前显示的 3 种任务类型（全部来自 `user_videos` 表）

| 类型 | GenerationType | 图标 | 颜色 | 说明 |
|------|---------------|------|------|------|
| Text to Video | `text_to_video` | ✍️ | 蓝色 | 文本生成视频 |
| Image to Video | `image_to_video` | 🖼️ | 紫色 | 图片转视频 |
| Video Effects | `video_effects` | ✨ | 粉色 | 视频特效 |

### 数据源

```
/admin/tasks 页面
├── 数据来源: user_videos 表
├── JOIN: users 表（获取用户邮箱）
└── 状态过滤: status != 'deleted'
```

---

## 🎯 需要添加的新数据类型

### AI Images 数据（来自 `user_images` 表）

根据 `lib/types/asset.ts` 和 `scripts/init-image-storage.sql`，需要添加：

| 新类型 | GenerationType | 建议图标 | 建议颜色 | 说明 |
|--------|---------------|----------|----------|------|
| Text to Image | `text_to_image` | 🎨 | 橙色 | 文本生成图片 |
| Image to Image | `image_to_image` | 🖌️ | 青色 | 图片转图片 |

---

## 📊 数据表结构对比

### `user_videos` 表字段（视频任务）

```typescript
{
  id: UUID
  user_id: UUID
  prompt: TEXT
  status: 'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted'
  original_url: TEXT
  storage_path: TEXT
  thumbnail_path: TEXT
  settings: JSONB {
    model: string
    generationType: 'text-to-video' | 'image-to-video' | 'video-effects'
    image_url?: string
    effectId?: string
    effectName?: string
    resolution?: string
    aspectRatio?: string
    duration?: string
  }
  wavespeed_request_id: TEXT
  download_progress: INTEGER
  error_message: TEXT
  duration_seconds: INTEGER
  file_size: INTEGER
  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

### `user_images` 表字段（图片任务）

```typescript
{
  id: UUID
  user_id: UUID
  prompt: TEXT
  status: 'uploading' | 'processing' | 'completed' | 'failed' | 'deleted'
  original_url: TEXT           // ⚠️ 对应 video 的 original_url
  storage_url: TEXT            // ⚠️ user_images 特有字段
  storage_path: TEXT | null
  wavespeed_request_id: TEXT
  model: TEXT
  aspect_ratio: TEXT | null
  generation_type: 'text-to-image' | 'image-to-image'  // ⚠️ 直接在表字段，不在 settings 里
  source_images: JSONB | null  // ⚠️ 对应 video 的 settings.image_url
  error_message: TEXT | null
  file_size: INTEGER | null
  metadata: JSONB | null

  // ⚠️ user_images 独有字段（user_videos 表没有）
  width: INTEGER
  height: INTEGER
  upload_source: 'file' | 'url'
  original_name: TEXT
  mime_type: TEXT
  processing_options: JSONB
  used_in_videos: INTEGER
  last_used_at: TIMESTAMP

  created_at: TIMESTAMP
  updated_at: TIMESTAMP
}
```

---

## 🔄 需要修改的文件清单

### 1️⃣ **类型定义** - `types/admin/tasks.d.ts`

```typescript
// 【修改前】
export type TaskType = 'video_generation';

// 【修改后】
export type TaskType = 'video_generation' | 'image_generation';
```

```typescript
// 【修改前】
export type GenerationType = 'text_to_video' | 'image_to_video' | 'video_effects';

// 【修改后】
export type GenerationType =
  | 'text_to_video'
  | 'image_to_video'
  | 'video_effects'
  | 'text_to_image'    // 🆕
  | 'image_to_image';  // 🆕
```

```typescript
// 【修改】UnifiedTask 接口
export interface UnifiedTask {
  // ... 现有字段

  // 🆕 添加图片特有字段
  image_url?: string | null;        // 图片的 storage_url
  width?: number | null;            // 图片宽度
  height?: number | null;           // 图片高度
  upload_source?: 'file' | 'url' | null;  // 上传来源
  source_images?: any | null;       // image-to-image 的源图片
}
```

---

### 2️⃣ **数据获取逻辑** - `lib/admin/all-tasks-fetcher.ts`

#### 需要添加的函数：

```typescript
/**
 * 🆕 从 user_images 表获取图片任务
 */
async function fetchImageTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { limit = 50, cursor, excludeEmail } = options;
  const supabase = getSupabaseAdminClient();

  let query = supabase
    .from('user_images')
    .select('*, users!inner(email)')
    .neq('status', 'deleted')
    .order('created_at', { ascending: false });

  // 应用邮箱过滤
  if (excludeEmail && excludeEmail.trim()) {
    query = query.not('users.email', 'ilike', `%${excludeEmail.trim()}%`);
  }

  // 应用游标
  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  const { data, error } = await query.limit(limit + 1);

  if (error) {
    console.error('Failed to fetch image tasks:', error);
    return { tasks: [], nextCursor: null, hasMore: false };
  }

  const flattenedData = (data || []).map((item: any) => ({
    ...item,
    user_email: item.users?.email || null,
  }));

  const allTasks = flattenedData.map((item) => normalizeImageTask(item));

  const hasMore = allTasks.length > limit;
  const tasks = hasMore ? allTasks.slice(0, limit) : allTasks;
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return { tasks, nextCursor, hasMore };
}
```

```typescript
/**
 * 🆕 将 user_images 表数据标准化为 UnifiedTask 格式
 */
function normalizeImageTask(rawTask: any): UnifiedTask {
  return {
    id: rawTask.id,
    task_type: 'image_generation',  // 🆕 新的任务类型
    user_id: rawTask.user_id || null,
    user_email: rawTask.user_email || null,
    status: rawTask.status,
    progress: rawTask.status === 'completed' ? 100 : 0,
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,

    // 生成类型和输入数据
    generation_type: rawTask.generation_type,  // 'text_to_image' | 'image_to_image'
    input_image_url: rawTask.source_images || null,  // image_to_image 的源图
    prompt: rawTask.prompt || '',

    // 输出数据（⚠️ 图片没有 video_url，使用 image_url）
    video_url: null,
    image_url: rawTask.storage_url,  // 🆕 图片的存储 URL
    storage_path: rawTask.storage_path || null,
    thumbnail_path: null,  // 图片没有缩略图

    // 任务参数
    model: rawTask.model || null,
    duration: null,  // 图片没有 duration
    resolution: null,  // 图片用 width x height 表示
    aspectRatio: rawTask.aspect_ratio || null,
    durationStr: null,
    settings: rawTask.metadata || {},

    // 图片特有字段
    width: rawTask.width || null,
    height: rawTask.height || null,
    upload_source: rawTask.upload_source || null,
    source_images: rawTask.source_images || null,

    // Video Effects 字段（图片没有）
    effectId: null,
    effectName: null,

    // 积分和错误
    credits_used: 0,
    error: rawTask.error_message || null,

    // 外部任务 ID
    wavespeed_request_id: rawTask.wavespeed_request_id,
  };
}
```

#### 需要修改的函数：

```typescript
/**
 * 【修改】获取所有任务（合并视频和图片）
 */
export async function fetchAllTasks(options: FetchTasksOptions): Promise<FetchTasksResult> {
  const { taskType } = options;

  // 根据 taskType 决定获取哪种任务
  if (taskType === 'video_generation') {
    return fetchVideoTasks(options);
  }

  if (taskType === 'image_generation') {
    return fetchImageTasks(options);  // 🆕 调用图片获取函数
  }

  // taskType === undefined，获取所有任务
  // 🚧 需要合并两个表的数据，按时间排序
  const [videoResult, imageResult] = await Promise.all([
    fetchVideoTasks(options),
    fetchImageTasks(options),
  ]);

  // 合并结果并按时间排序
  const allTasks = [...videoResult.tasks, ...imageResult.tasks].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const hasMore = videoResult.hasMore || imageResult.hasMore;
  const tasks = allTasks.slice(0, options.limit || 50);
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return { tasks, nextCursor, hasMore };
}
```

```typescript
/**
 * 【修改】获取任务统计信息（包含图片）
 */
export async function fetchTaskStats(taskType?: TaskType): Promise<TaskStats> {
  const supabase = getSupabaseAdminClient();

  if (taskType === 'video_generation') {
    // 只统计视频任务（现有逻辑）
    return fetchVideoStats();
  }

  if (taskType === 'image_generation') {
    // 🆕 只统计图片任务
    const [totalResult, completedResult, failedResult, processingResult] = await Promise.allSettled([
      supabase.from('user_images').select('id', { count: 'exact', head: true }).neq('status', 'deleted'),
      supabase.from('user_images').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('user_images').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('user_images').select('id', { count: 'exact', head: true })
        .in('status', ['uploading', 'processing']),
    ]);

    return {
      total: totalResult.status === 'fulfilled' ? totalResult.value.count || 0 : 0,
      completed: completedResult.status === 'fulfilled' ? completedResult.value.count || 0 : 0,
      failed: failedResult.status === 'fulfilled' ? failedResult.value.count || 0 : 0,
      processing: processingResult.status === 'fulfilled' ? processingResult.value.count || 0 : 0,
    };
  }

  // 🆕 统计所有任务（视频 + 图片）
  const [videoStats, imageStats] = await Promise.all([
    fetchVideoStats(),
    fetchImageStats(),
  ]);

  return {
    total: videoStats.total + imageStats.total,
    completed: videoStats.completed + imageStats.completed,
    failed: videoStats.failed + imageStats.failed,
    processing: videoStats.processing + imageStats.processing,
  };
}
```

---

### 3️⃣ **前端列表组件** - `components/admin/tasks-list-with-pagination.tsx`

#### 需要修改的地方：

```typescript
// 【修改】generation_type 列 - 添加图片类型的显示
{
  name: 'generation_type',
  title: 'Generation Type',
  className: 'w-36',
  callback: (item: UnifiedTask) => {
    let color: string;
    let icon: string;
    let label: string;

    switch (item.generation_type) {
      case 'image_to_video':
        color = 'bg-purple-100 text-purple-800 border-purple-200';
        icon = '🖼️';
        label = 'Image to Video';
        break;
      case 'video_effects':
        color = 'bg-pink-100 text-pink-800 border-pink-200';
        icon = '✨';
        label = 'Video Effects';
        break;
      // 🆕 添加图片生成类型
      case 'text_to_image':
        color = 'bg-orange-100 text-orange-800 border-orange-200';
        icon = '🎨';
        label = 'Text to Image';
        break;
      case 'image_to_image':
        color = 'bg-cyan-100 text-cyan-800 border-cyan-200';
        icon = '🖌️';
        label = 'Image to Image';
        break;
      case 'text_to_video':
      default:
        color = 'bg-blue-100 text-blue-800 border-blue-200';
        icon = '✍️';
        label = 'Text to Video';
        break;
    }

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${color} whitespace-nowrap inline-flex items-center gap-1`}>
        <span>{icon}</span>
        <span>{label}</span>
      </span>
    );
  },
},
```

```typescript
// 【修改】result 列 - 添加图片结果的显示
{
  name: 'result',
  title: 'Result',
  className: 'w-32',
  callback: (item: UnifiedTask) => {
    // 🆕 如果是图片任务，显示图片
    if (item.task_type === 'image_generation' && item.image_url) {
      return <MediaPreview src={item.image_url} type="image" alt="Result Image" placeholder="No result" />;
    }

    // 视频任务逻辑（现有）
    const resultUrl = item.video_url || item.result_url || item.audio_url;
    if (!resultUrl) {
      return <span className="text-gray-400 text-xs">No result</span>;
    }

    const isVideo = item.video_url || item.result_url;
    const isAudio = item.audio_url;

    if (isAudio) {
      return (
        <a href={resultUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">
          🔊 Audio
        </a>
      );
    }

    return <MediaPreview src={resultUrl} type="video" alt="Result Video" placeholder="No result" />;
  },
},
```

```typescript
// 【修改】parameters 列 - 图片任务显示宽高和比例
{
  name: 'parameters',
  title: 'Parameters',
  className: 'w-40',
  callback: (item: UnifiedTask) => {
    // 🆕 如果是图片任务，显示宽高
    if (item.task_type === 'image_generation') {
      return (
        <div className="flex flex-col gap-1 text-xs">
          {/* 宽高 */}
          {item.width && item.height && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">Size:</span>
              <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
                {item.width} × {item.height}
              </span>
            </div>
          )}

          {/* Aspect Ratio */}
          {item.aspectRatio && (
            <div className="flex items-center gap-1">
              <span className="text-gray-500 font-medium">Ratio:</span>
              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
                {item.aspectRatio}
              </span>
            </div>
          )}

          {/* 如果都没有，显示占位符 */}
          {!item.width && !item.height && !item.aspectRatio && (
            <span className="text-gray-400">-</span>
          )}
        </div>
      );
    }

    // 视频任务逻辑（现有）
    return (
      <div className="flex flex-col gap-1 text-xs">
        {/* Duration */}
        {item.durationStr && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 font-medium">Duration:</span>
            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
              {item.durationStr}
            </span>
          </div>
        )}

        {/* Resolution */}
        {item.resolution && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 font-medium">Res:</span>
            <span className="px-2 py-0.5 rounded bg-green-100 text-green-800 font-semibold">
              {item.resolution}
            </span>
          </div>
        )}

        {/* Aspect Ratio */}
        {item.aspectRatio && (
          <div className="flex items-center gap-1">
            <span className="text-gray-500 font-medium">Ratio:</span>
            <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 font-semibold">
              {item.aspectRatio}
            </span>
          </div>
        )}

        {/* 如果都没有，显示占位符 */}
        {!item.durationStr && !item.resolution && !item.aspectRatio && (
          <span className="text-gray-400">-</span>
        )}
      </div>
    );
  },
},
```

---

### 4️⃣ **任务类型过滤器** - `components/admin/task-type-filter.tsx`

```typescript
// 【修改】添加 image_generation 选项
const taskTypes: { value: TaskType | 'all'; label: string }[] = [
  { value: 'all', label: 'All Tasks' },
  { value: 'video_generation', label: 'Video Generation' },
  { value: 'image_generation', label: 'Image Generation' },  // 🆕
];
```

---

### 5️⃣ **API 路由** - `app/api/admin/tasks/route.ts`

（大部分逻辑在 `all-tasks-fetcher.ts` 中，这里基本不需要修改，只需要确保 `taskType` 参数能传递 `'image_generation'`）

---

## ⚠️ 需要注意的关键差异

### 1. 字段映射差异

| UnifiedTask 字段 | user_videos | user_images |
|------------------|-------------|-------------|
| `video_url` | ✅ `original_url` | ❌ null |
| `image_url` | ❌ null | ✅ `storage_url` |
| `storage_path` | ✅ `storage_path` | ✅ `storage_path` |
| `thumbnail_path` | ✅ `thumbnail_path` | ❌ null |
| `input_image_url` | ✅ `settings.image_url` | ✅ `source_images` |
| `generation_type` | ✅ `settings.generationType` | ✅ `generation_type` (表字段) |
| `model` | ✅ `settings.model` | ✅ `model` (表字段) |
| `width` / `height` | ❌ null | ✅ `width` / `height` |
| `duration` | ✅ `duration_seconds` | ❌ null |
| `resolution` | ✅ `settings.resolution` | ❌ null |

### 2. Status 字段差异

```typescript
// user_videos.status
'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted'

// user_images.status
'uploading' | 'processing' | 'completed' | 'failed' | 'deleted'
```

⚠️ **注意**: `user_images` 有 `'uploading'` 状态，`user_videos` 有 `'generating'` 和 `'downloading'` 状态。

需要在统计时处理：
- 视频的 `processing` = `generating` + `downloading` + `processing`
- 图片的 `processing` = `uploading` + `processing`

---

## 🚀 实施步骤建议

1. ✅ **第一步**：修改类型定义 `types/admin/tasks.d.ts`
2. ✅ **第二步**：实现 `lib/admin/all-tasks-fetcher.ts` 中的图片数据获取逻辑
3. ✅ **第三步**：更新前端组件 `components/admin/tasks-list-with-pagination.tsx`
4. ✅ **第四步**：更新任务类型过滤器 `components/admin/task-type-filter.tsx`
5. ✅ **第五步**：测试数据获取和显示
6. ✅ **第六步**：确认邮箱过滤、分页等功能正常工作

---

## 📝 测试清单

- [ ] 能否正确获取 `user_images` 表的数据
- [ ] 图片任务是否正确显示在列表中
- [ ] Text to Image 和 Image to Image 两种类型是否能区分显示
- [ ] 图片的预览是否能正常点击查看大图
- [ ] 邮箱过滤是否对图片任务生效
- [ ] 分页（Load More）是否正常
- [ ] 任务类型过滤器（All / Video / Image）是否正常切换
- [ ] 统计数据（total / completed / failed / processing）是否准确
- [ ] 合并显示所有任务时，是否按时间正确排序

---

## 🎯 最终效果预期

完成后，`/admin/tasks` 页面将显示 **5 种任务类型**：

| 序号 | 任务类型 | TaskType | GenerationType | 图标 | 颜色 |
|------|----------|----------|----------------|------|------|
| 1 | Text to Video | `video_generation` | `text_to_video` | ✍️ | 蓝色 |
| 2 | Image to Video | `video_generation` | `image_to_video` | 🖼️ | 紫色 |
| 3 | Video Effects | `video_generation` | `video_effects` | ✨ | 粉色 |
| 4 | **Text to Image** | `image_generation` | `text_to_image` | 🎨 | 橙色 |
| 5 | **Image to Image** | `image_generation` | `image_to_image` | 🖌️ | 青色 |

---

## 🔗 相关文件路径

| 文件类型 | 文件路径 | 行数 |
|----------|----------|------|
| 类型定义 | `types/admin/tasks.d.ts` | 88 |
| 数据获取 | `lib/admin/all-tasks-fetcher.ts` | 194 |
| 列表组件 | `components/admin/tasks-list-with-pagination.tsx` | 446 |
| 过滤组件 | `components/admin/task-type-filter.tsx` | 78 |
| API 路由 | `app/api/admin/tasks/route.ts` | 58 |
| 页面组件 | `app/(main)/admin/tasks/page.tsx` | 47 |
| 数据库 Schema | `scripts/init-image-storage.sql` | 245 |
| 图片类型定义 | `lib/types/asset.ts` | 101 |

---

**文档创建时间**: 2025-11-10
**负责人**: Claude Code
**状态**: 待审核
