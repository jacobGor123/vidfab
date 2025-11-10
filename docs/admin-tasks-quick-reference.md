# Admin Tasks 快速参考

## 文件清单

| 文件 | 路径 | 行数 | 说明 |
|------|------|------|------|
| 页面 | `app/(main)/admin/tasks/page.tsx` | 47 | SSR 页面，禁用缓存 |
| API | `app/api/admin/tasks/route.ts` | 58 | GET 端点，支持分页和过滤 |
| 列表组件 | `components/admin/tasks-list-with-pagination.tsx` | 446 | 核心列表，无限滚动 |
| 业务逻辑 | `lib/admin/all-tasks-fetcher.ts` | 194 | 数据获取和标准化 |
| 类型定义 | `types/admin/tasks.d.ts` | 88 | 7 个核心类型 |
| 媒体预览 | `components/admin/media-preview.tsx` | 111 | 图像/视频预览 |
| 过滤器 | `components/admin/task-type-filter.tsx` | 78 | 任务类型过滤 (未使用) |
| DB 层 | `lib/database/user-videos.ts` | 805 | 数据库操作 |

## 数据流

```
用户输入 → 前端 (客户端) → API 路由 → 业务逻辑 → 数据库 → JSON 响应 → 前端渲染
```

### 初始加载
```
GET /admin/tasks?type=video_generation
  ↓
TasksPage (SSR)
  ├─ fetchAllTasks({ taskType: 'video_generation', limit: 50 })
  ├─ fetchTaskStats('video_generation')
  ↓
返回 tasks, stats
  ↓
<TasksListWithPagination initialTasks={tasks} />
```

### 无限滚动
```
用户点击 "Load More"
  ↓
TasksListWithPagination.loadMore()
  ├─ fetch(`/api/admin/tasks?cursor=...&type=...&excludeEmail=...`)
  ↓
API /api/admin/tasks
  ├─ requireAdmin()
  ├─ fetchAllTasks({ cursor, taskType, excludeEmail, limit: 50 })
  ↓
setTasks((prev) => [...prev, ...newTasks])
```

### 邮箱过滤
```
用户输入 "test"
  ↓
防抖 300ms
  ↓
excludeEmail 变化
  ↓
fetch(`/api/admin/tasks?excludeEmail=test`)
  ↓
query.not('users.email', 'ilike', '%test%')
  ↓
重置列表
```

## API 端点

### GET /api/admin/tasks

**查询参数**:
- `cursor`: string (ISO timestamp，用于分页)
- `type`: 'video_generation' (任务类型)
- `limit`: number (默认 50)
- `excludeEmail`: string (排除邮箱关键词)

**请求示例**:
```
GET /api/admin/tasks?limit=50
GET /api/admin/tasks?cursor=2025-11-10T10:30:00.000Z&limit=50&type=video_generation
GET /api/admin/tasks?excludeEmail=test&limit=50
```

**响应示例**:
```json
{
  "success": true,
  "tasks": [
    {
      "id": "uuid-1",
      "task_type": "video_generation",
      "generation_type": "text_to_video",
      "user_email": "user@example.com",
      "prompt": "A cat running...",
      "status": "completed",
      "progress": 100,
      "video_url": "https://...",
      "model": "model-v1",
      "created_at": "2025-11-10T10:30:00.000Z",
      ...
    },
    ...
  ],
  "nextCursor": "2025-11-10T10:00:00.000Z",
  "hasMore": true
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "Unauthorized access"
}
// HTTP 401
```

## 核心类型

### UnifiedTask (28 个字段)

**核心 (7)**:
```typescript
id: string
task_type: 'video_generation'
user_id: string | null
user_email: string | null
status: 'generating' | 'downloading' | 'processing' | 'completed' | 'failed' | 'deleted'
progress: 0-100
created_at: ISO timestamp
updated_at: ISO timestamp
```

**输入 (3)**:
```typescript
generation_type: 'text_to_video' | 'image_to_video' | 'video_effects'
input_image_url: string | null
prompt: string
```

**输出 (3)**:
```typescript
video_url: string | null
storage_path: string | null
thumbnail_path: string | null
```

**参数 (6)**:
```typescript
model: string | null
duration: number | null
resolution: '480p' | '720p' | '1080p' | null
aspectRatio: '16:9' | '9:16' | '1:1' | null
durationStr: '5s' | '8s' | '10s' | null
settings: { image_url?, duration?, resolution?, ... }
```

**Effects 特有 (2)**:
```typescript
effectId: string | null
effectName: string | null
```

**错误 (2)**:
```typescript
error: string | null
credits_used: 0
```

**外部 (1)**:
```typescript
wavespeed_request_id: string
```

## 表格列 (11 列)

| 列 | 宽度 | 内容 |
|----|------|------|
| Generation Type | w-36 | 🖼️ Image to Video / ✨ Video Effects / ✍️ Text to Video |
| User | w-40 | user@example.com + UUID 前 8 位 |
| Input Image | w-28 | 可点击预览的图像缩略图 |
| Prompt / Effect | w-48 | 长文本 + tooltip，Effects 优先显示特效名称 |
| Parameters | w-40 | Duration (蓝) + Resolution (绿) + Aspect Ratio (紫) |
| Result | w-32 | 视频预览或音频链接 |
| Status | w-28 | 状态徽章 + 进度条 |
| Model | w-24 | 模型名称 |
| Created | w-36 | 日期时间 |
| Error | max-w-xs | 错误信息 + tooltip |

## 生成类型识别逻辑

```typescript
determineGenerationType(settings) {
  1. ✅ 检查 settings.generationType (支持转换中划线)
     - 'image-to-video' → 'image_to_video'
     - 'video-effects' → 'video_effects'
     - 'text-to-video' → 'text_to_video'
  
  2. ✅ 检查 effectId / effectName / model='video-effects'
     → 'video_effects'
  
  3. ✅ 检查 image_url / imageUrl / image / inputImage
     → 'image_to_video'
  
  4. ❌ 默认
     → 'text_to_video'
}
```

## 游标分页原理

```
第一次请求
GET /api/admin/tasks?limit=50
  ↓
Query: SELECT * FROM user_videos 
       WHERE status != 'deleted'
       ORDER BY created_at DESC
       LIMIT 51

返回: tasks[0..49] + 1 条额外数据
hasMore = true
nextCursor = tasks[49].created_at  // 最后一条的时间戳

第二次请求
GET /api/admin/tasks?cursor=2025-11-10T10:00:00Z&limit=50
  ↓
Query: SELECT * FROM user_videos
       WHERE status != 'deleted'
       AND created_at < '2025-11-10T10:00:00Z'
       ORDER BY created_at DESC
       LIMIT 51

返回: 下一批 50 条任务
```

## 颜色系统

**生成类型**:
- text_to_video: 蓝色 (`bg-blue-100 text-blue-800`)
- image_to_video: 紫色 (`bg-purple-100 text-purple-800`)
- video_effects: 粉色 (`bg-pink-100 text-pink-800`)

**状态**:
- generating: 黄色
- downloading: 蓝色
- processing: 紫色
- completed: 绿色
- failed: 红色
- deleted: 灰色

**参数徽章**:
- Duration: 蓝色
- Resolution: 绿色
- Aspect Ratio: 紫色

## 关键函数

### fetchAllTasks(options)
```typescript
// 源文件: lib/admin/all-tasks-fetcher.ts
const result = await fetchAllTasks({
  taskType: 'video_generation',
  limit: 50,
  cursor: undefined,  // 首次加载
  excludeEmail: 'spam'
});

// 返回
{
  tasks: UnifiedTask[],
  nextCursor: '2025-11-10T10:00:00Z' | null,
  hasMore: boolean
}
```

### fetchTaskStats(taskType?)
```typescript
const stats = await fetchTaskStats('video_generation');

// 返回
{
  total: 1000,
  completed: 850,
  failed: 50,
  processing: 100
}
```

### normalizeTask(rawTask)
```typescript
// 将 user_videos 原始数据转换为 UnifiedTask
const unified = normalizeTask({
  id: '...',
  settings: { image_url: '...', duration: '10s', ... },
  original_url: '...',
  download_progress: 75,
  ...
});
```

### determineGenerationType(settings)
```typescript
const type = determineGenerationType(settings);
// 返回: 'text_to_video' | 'image_to_video' | 'video_effects'
```

## 防抖和缓存

**邮箱搜索防抖**:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    setExcludeEmail(excludeEmailInput.trim());
  }, 300);  // 等待 300ms 无输入后触发
  return () => clearTimeout(timer);
}, [excludeEmailInput]);
```

> 这样可以避免用户快速输入时发送多个 API 请求

## 权限检查

```typescript
// 页面级
if (!isAdmin) redirect('/');

// API 级
await requireAdmin();  // 抛出 'Unauthorized' 错误
```

> 实现位置: `lib/admin/auth.ts`

## 调试技巧

**1. 检查网络请求**:
```typescript
console.log('Fetch URL:', `/api/admin/tasks?cursor=${nextCursor}&...`);
```

**2. 检查数据库查询**:
```typescript
// lib/admin/all-tasks-fetcher.ts 中查看详细日志
```

**3. 检查数据标准化**:
```typescript
console.log('Raw:', rawTask);
console.log('Normalized:', normalizeTask(rawTask));
```

## 常见问题

**Q: 为什么列表为空?**
A: 检查权限 (requireAdmin) 或数据库连接

**Q: Load More 不工作?**
A: 检查 `hasMore` 和 `nextCursor` 值

**Q: 邮箱过滤没效果?**
A: 检查 users.email 是否为 null 或有前后空格

**Q: 生成类型总是显示 text_to_video?**
A: 检查 settings 结构，确保字段名正确

## 扩展点

### 添加新列
```typescript
// components/admin/tasks-list-with-pagination.tsx 中的 table.columns

{
  name: 'new_field',
  title: 'New Column',
  className: 'w-32',
  callback: (item: UnifiedTask) => {
    return <div>{item.new_field}</div>;
  },
}
```

### 添加新过滤
```typescript
// 修改 TasksListWithPagination 中的 fetchTasks()
const response = await fetch(
  `/api/admin/tasks?${params}` // 添加 params.set('newFilter', value)
);
```

### 添加新状态
```typescript
// types/admin/tasks.d.ts
type TaskStatus = '...' | 'new_status';

// components/admin/tasks-list-with-pagination.tsx 中 statusColors
const statusColors = {
  new_status: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  ...
};
```

## 性能指标

- **初始加载**: ~50ms (10 条任务 SSR)
- **无限滚动**: ~200-500ms (API 请求 + 渲染)
- **邮箱过滤**: ~300-700ms (防抖 + API 请求)
- **数据库查询**: ~100-300ms (取决于表大小)

## 依赖清单

```
Next.js 14+
├── React 18+
├── TypeScript
├── Supabase (数据库)
├── shadcn/ui (UI 组件)
│   ├── Dialog
│   ├── Input
│   ├── Tooltip
│   └── Table (custom slot)
└── Lucide Icons
    └── X (清空按钮)
```

## 相关文档

- 完整架构: `/docs/admin-tasks-module-overview.md`
- 数据库设计: Supabase Dashboard
- 业务逻辑: `lib/admin/all-tasks-fetcher.ts`
- 类型定义: `types/admin/tasks.d.ts`
