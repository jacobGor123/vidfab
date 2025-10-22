# 管理后台实现方案 - Users, Orders, Tasks 模块

## 目录
1. [架构概述](#架构概述)
2. [Users 用户管理模块](#users-用户管理模块)
3. [Paid Orders 订单管理模块](#paid-orders-订单管理模块)
4. [Tasks 任务管理模块](#tasks-任务管理模块)
5. [核心依赖与技术栈](#核心依赖与技术栈)
6. [最佳实践与设计模式](#最佳实践与设计模式)

---

## 架构概述

### 整体架构图

```
用户请求
   ↓
Page Component (Server Component)
   ↓
Model Layer (数据查询)
   ↓
Supabase PostgreSQL
   ↓
TableSlot (呈现层)
   ↓
TableBlock (UI组件)
```

### 核心设计理念

1. **分层架构**: Pages → Models → Database，职责清晰
2. **Server Components 优先**: 利用 Next.js 14 App Router 的 SSR 能力
3. **可复用的 Slot 系统**: 统一的表格展示组件
4. **类型安全**: 完整的 TypeScript 类型定义

---

## Users 用户管理模块

### 1. 路由与页面结构

**文件路径**: `app/[locale]/(admin)/admin/users/page.tsx`

```typescript
// 关键特性
export const runtime = 'edge'; // 使用 Edge Runtime 加速响应

export default async function UsersPage() {
  // 1. 服务端数据获取
  const users = await getUsers(1, 50);

  // 2. 定义表格列
  const columns: TableColumn[] = [
    { name: "uuid", title: "UUID" },
    { name: "email", title: "Email" },
    { name: "nickname", title: "Name" },
    {
      name: "avatar_url",
      title: "Avatar",
      callback: (row) => (
        <img src={row.avatar_url} className="w-10 h-10 rounded-full" />
      ),
    },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  // 3. 组装 Table Slot
  const table: TableSlotType = {
    title: "All Users",
    columns,
    data: users,
  };

  // 4. 渲染表格组件
  return <TableSlot {...table} />;
}
```

### 2. 数据模型层

**文件路径**: `models/user.ts`

```typescript
/**
 * 核心用户查询函数
 * 支持分页查询，默认按创建时间倒序
 */
export async function getUsers(
  page: number = 1,
  limit: number = 50
): Promise<User[] | undefined> {
  const supabase = getSupabaseClient();
  const offset = (page - 1) * limit;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false });

  if (error) {
    return undefined;
  }

  return data as any;
}

// 其他用户查询函数
- findUserByEmail(email: string)
- findUserByUuid(uuid: string)
- findUserByEmailAndProvider(email: string, provider: string)
```

### 3. 关键功能实现

- **分页查询**: 使用 Supabase 的 `.range()` 方法
- **排序**: 按创建时间降序 `.order("created_at", { ascending: false })`
- **头像展示**: 通过 `callback` 自定义渲染
- **时间格式化**: 使用 `moment.js` 格式化时间戳

---

## Paid Orders 订单管理模块

### 1. 路由与页面结构

**文件路径**: `app/[locale]/(admin)/admin/paid-orders/page.tsx`

```typescript
export default async function PaidOrdersPage() {
  // 1. 获取已支付订单
  const orders = await getPaiedOrders(1, 50);

  // 2. 定义订单表格列
  const columns: TableColumn[] = [
    { name: "order_no", title: "Order No" },
    { name: "paid_email", title: "Paid Email" },
    { name: "product_name", title: "Product Name" },
    { name: "amount", title: "Amount" },
    {
      name: "created_at",
      title: "Created At",
      callback: (row) => moment(row.created_at).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const table: TableSlotType = {
    title: "Paid Orders",
    columns,
    data: orders,
  };

  return <TableSlot {...table} />;
}
```

### 2. 数据模型层

**文件路径**: `models/order.ts`

```typescript
/**
 * 获取已支付订单
 * 筛选 status = 'paid' 的订单
 */
export async function getPaiedOrders(
  page: number,
  limit: number
): Promise<Order[] | undefined> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("status", "paid")  // 筛选已支付订单
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit);

  if (error) {
    return undefined;
  }

  return data as any;
}

// 订单状态枚举
export enum OrderStatus {
  Created = "created",
  Paid = "paid",
  Deleted = "deleted",
}

// 其他订单查询函数
- findOrderByOrderNo(order_no: string)
- getOrdersByUserUuid(user_uuid: string)
- getOrdersByPaidEmail(user_email: string)
- getUserActiveSubscription(user_uuid: string)
- getUserCurrentPlan(user_uuid: string)
```

### 3. 关键功能实现

- **状态筛选**: 使用 `.eq("status", "paid")` 只查询已支付订单
- **订单号展示**: 直接显示完整订单号
- **金额显示**: 显示订单金额
- **支付邮箱**: 显示实际支付的邮箱地址

---

## Tasks 任务管理模块

### 1. 路由与页面结构

**文件路径**: `app/[locale]/(admin)/admin/tasks/page.tsx`

```typescript
/**
 * 统一任务管理页面
 * 支持筛选不同类型的任务：图片转视频、音效添加、去水印等
 */
interface TasksPageProps {
  searchParams: {
    type?: TaskType;  // 任务类型筛选参数
  };
}

export default async function TasksPage({ searchParams }: TasksPageProps) {
  const taskType = searchParams.type;

  // 1. 获取任务列表（支持游标分页）
  const { tasks, nextCursor, hasMore } = await fetchAllTasks({
    taskType,
    limit: 50,
  });

  // 2. 获取统计信息
  const stats = await fetchTaskStats(taskType);

  // 3. 渲染任务列表和类型筛选器
  return (
    <div>
      <TaskTypeFilter currentType={taskType || 'all'} />
      <TasksListWithPagination
        initialTasks={tasks}
        initialNextCursor={nextCursor}
        initialHasMore={hasMore}
        taskType={taskType}
        stats={stats}
      />
    </div>
  );
}
```

### 2. 核心业务逻辑层

**文件路径**: `lib/admin/all-tasks-fetcher.ts`

```typescript
// 支持的任务类型
export type TaskType =
  | 'video_generation'    // 图片转视频
  | 'audio_generation'    // 视频音效添加
  | 'watermark_removal'   // 视频去水印
  | 'video_upscaler'      // 视频超分辨率
  | 'video_effects'       // AI视频特效
  | 'face_swap';          // 人脸替换

// 统一的任务数据接口
export interface UnifiedTask {
  id: string;
  task_type: TaskType;
  user_id: string | null;
  user_email: string | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  created_at: string;
  updated_at: string;

  // 输入数据（根据任务类型不同）
  input_image_url?: string | null;
  input_video_url?: string | null;
  face_image_url?: string | null;
  prompt?: string | null;

  // 输出数据
  result_url?: string | null;
  video_url?: string | null;
  audio_url?: string | null;

  // 任务参数
  model?: string | null;
  provider?: string | null;
  duration?: number | null;
  target_resolution?: string | null;
  template_id?: string | null;
  template_name?: string | null;

  // 积分和错误
  credits_used: number;
  error?: string | null;

  // 外部任务ID
  replicate_prediction_id?: string | null;
  wavespeed_task_id?: string | null;
  external_task_id?: string | null;
}

/**
 * 获取所有类型的任务（支持基于游标的分页）
 *
 * 关键特性:
 * 1. 游标分页：使用时间戳游标，避免传统分页的偏移问题
 * 2. 多表并行查询：同时查询6个任务表
 * 3. 数据标准化：将不同表的数据统一为 UnifiedTask 格式
 */
export async function fetchAllTasks(options: {
  taskType?: TaskType;
  limit?: number;
  cursor?: string; // ISO时间戳字符串
}): Promise<{ tasks: UnifiedTask[]; nextCursor: string | null; hasMore: boolean }> {
  const { taskType, limit = 50, cursor } = options;
  const supabase = getSupabaseClient();

  const allTasks: UnifiedTask[] = [];

  // 定义要查询的表
  const tablesToQuery: { table: string; type: TaskType }[] = taskType
    ? [{ table: getTableName(taskType), type: taskType }]
    : [
        { table: 'video_generation_tasks', type: 'video_generation' },
        { table: 'audio_generation_tasks', type: 'audio_generation' },
        { table: 'watermark_removal_tasks', type: 'watermark_removal' },
        { table: 'video_upscaler_tasks', type: 'video_upscaler' },
        { table: 'video_effect_tasks', type: 'video_effects' },
        { table: 'video_face_swap_tasks', type: 'face_swap' },
      ];

  // 并行查询所有表
  const results = await Promise.allSettled(
    tablesToQuery.map(({ table, type }) => {
      let query = supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false });

      // 如果有游标，只查询该时间点之前的数据
      if (cursor) {
        query = query.lt('created_at', cursor);
      }

      // 每个表查询 limit+1 条，用于判断是否还有更多数据
      return query
        .limit(limit + 1)
        .then(({ data, error }) => {
          if (error) {
            console.warn(`⚠️  Failed to fetch ${table}:`, error.message);
            return [];
          }
          return (data || []).map((item) => normalizeTask(item, type));
        });
    })
  );

  // 合并结果
  results.forEach((result) => {
    if (result.status === 'fulfilled') {
      allTasks.push(...result.value);
    }
  });

  // 按创建时间降序排序
  allTasks.sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 判断是否还有更多数据
  const hasMore = allTasks.length > limit;
  const tasks = hasMore ? allTasks.slice(0, limit) : allTasks;

  // 计算下一页的游标（最后一条记录的时间）
  const nextCursor = tasks.length > 0 ? tasks[tasks.length - 1].created_at : null;

  return {
    tasks,
    nextCursor,
    hasMore,
  };
}

/**
 * 获取任务统计信息
 * 并行查询所有表的统计数据
 */
export async function fetchTaskStats(taskType?: TaskType) {
  const supabase = getSupabaseClient();

  const tablesToQuery = taskType
    ? [getTableName(taskType)]
    : [
        'video_generation_tasks',
        'audio_generation_tasks',
        'watermark_removal_tasks',
        'video_upscaler_tasks',
        'video_effect_tasks',
        'video_face_swap_tasks',
      ];

  let total = 0;
  let completed = 0;
  let failed = 0;
  let processing = 0;

  // 并行查询统计（每个表4个查询）
  const results = await Promise.allSettled(
    tablesToQuery.flatMap((table) => [
      supabase.from(table).select('id', { count: 'exact', head: true }),
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from(table).select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from(table).select('id', { count: 'exact', head: true }).in('status', ['pending', 'processing']),
    ])
  );

  // 聚合统计结果
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      const count = result.value.count || 0;
      const statType = index % 4;

      if (statType === 0) total += count;
      else if (statType === 1) completed += count;
      else if (statType === 2) failed += count;
      else if (statType === 3) processing += count;
    }
  });

  return { total, completed, failed, processing };
}

/**
 * 标准化任务数据
 * 将不同表的原始数据转换为统一的 UnifiedTask 格式
 */
function normalizeTask(rawTask: any, taskType: TaskType): UnifiedTask {
  const base = {
    id: `${taskType}_${rawTask.id}`,
    task_type: taskType,
    user_id: rawTask.user_id || null,
    user_email: rawTask.user_email || null,
    status: rawTask.status,
    progress: rawTask.progress || 0,
    created_at: rawTask.created_at,
    updated_at: rawTask.updated_at,
    credits_used: rawTask.credits_used || 0,
    error: rawTask.error || null,
  };

  // 根据任务类型添加特定字段
  switch (taskType) {
    case 'video_generation':
      return {
        ...base,
        input_image_url: rawTask.image_url || rawTask.input_image || null,
        prompt: rawTask.prompt || rawTask.description || null,
        video_url: rawTask.video_url || rawTask.result_url || null,
        model: rawTask.model || rawTask.provider || null,
        provider: rawTask.provider || null,
        duration: rawTask.duration || null,
        replicate_prediction_id: rawTask.replicate_prediction_id || null,
        external_task_id: rawTask.external_task_id || null,
      };

    case 'audio_generation':
      return {
        ...base,
        input_video_url: rawTask.video_url || null,
        prompt: rawTask.prompt || null,
        audio_url: rawTask.audio_url || null,
        replicate_prediction_id: rawTask.replicate_prediction_id || null,
      };

    // ... 其他类型的映射
  }
}
```

### 3. 任务列表组件（支持客户端分页）

**文件路径**: `components/admin/tasks-list-with-pagination.tsx`

```typescript
'use client';

interface TasksListProps {
  initialTasks: UnifiedTask[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  taskType?: TaskType;
  stats: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
  };
}

export default function TasksListWithPagination({
  initialTasks,
  initialNextCursor,
  initialHasMore,
  taskType,
  stats,
}: TasksListProps) {
  const [tasks, setTasks] = useState<UnifiedTask[]>(initialTasks);
  const [nextCursor, setNextCursor] = useState<string | null>(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);

  /**
   * 加载更多任务
   * 调用 API 路由获取下一页数据
   */
  const loadMore = async () => {
    if (!hasMore || loading || !nextCursor) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        cursor: nextCursor,
      });
      if (taskType) {
        params.set('type', taskType);
      }

      const response = await fetch(`/api/admin/tasks?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setTasks((prev) => [...prev, ...data.tasks]);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      }
    } catch (error) {
      console.error('加载更多任务失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 定义表格列（包含自定义渲染）
  const table: TableSlotType = {
    title: `${taskType ? getTaskTypeLabel(taskType) + ' - ' : ''}任务管理 (总计: ${stats.total} | 完成: ${stats.completed} | 失败: ${stats.failed} | 处理中: ${stats.processing})`,
    columns: [
      {
        name: 'task_type',
        title: '类型',
        className: 'w-24',
        callback: (item: UnifiedTask) => {
          const colors: Record<TaskType, string> = {
            video_generation: 'bg-blue-100 text-blue-800 border-blue-200',
            audio_generation: 'bg-orange-100 text-orange-800 border-orange-200',
            watermark_removal: 'bg-purple-100 text-purple-800 border-purple-200',
            video_upscaler: 'bg-green-100 text-green-800 border-green-200',
            video_effects: 'bg-pink-100 text-pink-800 border-pink-200',
            face_swap: 'bg-indigo-100 text-indigo-800 border-indigo-200',
          };
          const color = colors[item.task_type] || 'bg-gray-100 text-gray-800 border-gray-200';
          return (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${color} whitespace-nowrap`}>
              {getTaskTypeLabel(item.task_type)}
            </span>
          );
        },
      },
      {
        name: 'user_email',
        title: '用户',
        className: 'w-40',
        callback: (item: UnifiedTask) => {
          return (
            <div className="flex flex-col">
              <span className="text-sm font-medium truncate">{item.user_email || 'N/A'}</span>
              {item.user_id && (
                <span className="text-xs text-gray-400 font-mono">{item.user_id.substring(0, 8)}...</span>
              )}
            </div>
          );
        },
      },
      {
        name: 'input_content',
        title: '输入',
        className: 'w-32',
        callback: (item: UnifiedTask) => {
          if (item.input_image_url || item.face_image_url) {
            return <MediaPreview src={item.input_image_url || item.face_image_url} type="image" alt="输入图片" placeholder="无图片" />;
          }
          if (item.input_video_url) {
            return <MediaPreview src={item.input_video_url} type="video" alt="输入视频" placeholder="无视频" />;
          }
          if (item.prompt) {
            const short = item.prompt.substring(0, 30);
            return (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help">
                      <span className="text-xs text-gray-600 line-clamp-2">
                        {short}{item.prompt.length > 30 ? '...' : ''}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-md">
                    <p className="text-sm whitespace-pre-wrap">{item.prompt}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          }
          return <span className="text-gray-400 text-xs">-</span>;
        },
      },
      // ... 更多列定义
    ],
    data: tasks,
    empty_message: tasks.length === 0 ? '暂无任务数据。用户创建任务后会在这里显示。' : '加载失败，请刷新重试。',
  };

  return (
    <div>
      <TableSlot {...table} />

      {/* 加载更多按钮 */}
      {hasMore && (
        <div className="flex justify-center mt-6 mb-8">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? '加载中...' : '加载更多'}
          </button>
        </div>
      )}

      {/* 已加载所有数据提示 */}
      {!hasMore && tasks.length > 0 && (
        <div className="text-center text-sm text-gray-500 mt-6 mb-8">
          已加载全部 {tasks.length} 条任务
        </div>
      )}
    </div>
  );
}
```

### 4. 任务类型筛选器

**文件路径**: `components/admin/task-type-filter.tsx`

```typescript
'use client';

const TASK_TYPES: (TaskType | 'all')[] = [
  'all',
  'video_generation',
  'audio_generation',
  'watermark_removal',
  'video_upscaler',
  'video_effects',
  'face_swap',
];

export default function TaskTypeFilter({ currentType = 'all' }: TaskTypeFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleTypeChange = (type: TaskType | 'all') => {
    const params = new URLSearchParams(searchParams.toString());

    if (type === 'all') {
      params.delete('type');
    } else {
      params.set('type', type);
    }

    router.push(`/admin/tasks?${params.toString()}`);
  };

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {TASK_TYPES.map((type) => {
        const isActive = type === currentType;
        const baseColor = getColor(type);
        const activeStyle = isActive
          ? 'ring-2 ring-offset-1 ring-current font-semibold'
          : 'opacity-70';

        return (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`px-3 py-1.5 rounded-md text-xs transition-all ${baseColor} ${activeStyle}`}
          >
            {getLabel(type)}
          </button>
        );
      })}
    </div>
  );
}
```

### 5. API 路由（支持游标分页）

**文件路径**: `app/api/admin/tasks/route.ts`

```typescript
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor') || undefined;
    const taskType = searchParams.get('type') as TaskType | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');

    const result = await fetchAllTasks({
      taskType,
      limit,
      cursor,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('获取任务列表失败:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取任务列表失败',
      },
      { status: 500 }
    );
  }
}
```

### 6. 媒体预览组件

**文件路径**: `components/admin/media-preview.tsx`

```typescript
'use client';

/**
 * 媒体预览组件
 * 功能：
 * 1. 缩略图展示（图片/视频）
 * 2. 点击放大预览
 * 3. 支持悬浮效果
 */
export default function MediaPreview({ src, type, alt = "", placeholder = "暂无内容" }: MediaPreviewProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return (
      <div className="w-24 h-16 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
        <span className="text-xs text-gray-400">{placeholder}</span>
      </div>
    );
  }

  return (
    <>
      {/* 缩略图 */}
      <div
        className="relative w-24 h-16 cursor-pointer group overflow-hidden rounded border border-gray-200 dark:border-gray-700 hover:border-primary transition-all"
        onClick={() => setIsOpen(true)}
      >
        {type === "image" ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover group-hover:scale-110 transition-transform"
            unoptimized
          />
        ) : (
          <video
            src={src}
            className="w-full h-full object-cover"
            muted
            playsInline
            preload="metadata"
          />
        )}
        {/* 悬浮放大图标 */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <svg className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
          </svg>
        </div>
      </div>

      {/* 放大弹窗 */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <div className="flex flex-col items-center gap-4 p-4">
            {type === "image" ? (
              <div className="relative w-full" style={{ minHeight: "400px" }}>
                <Image src={src} alt={alt} width={1200} height={800} className="w-full h-auto rounded-lg" unoptimized />
              </div>
            ) : (
              <video src={src} controls autoPlay loop className="w-full max-h-[70vh] rounded-lg" />
            )}
            {alt && <p className="text-sm text-gray-500">{alt}</p>}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

---

## 核心依赖与技术栈

### 1. 前端框架与库

```json
{
  "dependencies": {
    // 核心框架
    "next": "^14.x",                    // Next.js 14 App Router
    "react": "^18.x",                   // React 18
    "typescript": "^5.x",               // TypeScript

    // UI组件库
    "@radix-ui/react-dialog": "^1.x",   // 对话框组件
    "@radix-ui/react-tooltip": "^1.x",  // 提示框组件
    "tailwindcss": "^3.x",              // Tailwind CSS

    // 数据库客户端
    "@supabase/supabase-js": "^2.x",    // Supabase 客户端

    // 工具库
    "moment": "^2.x",                   // 时间格式化
    "next-intl": "^3.x"                 // 国际化
  }
}
```

### 2. 数据库（Supabase PostgreSQL）

**核心表结构**:

```sql
-- 用户表
CREATE TABLE users (
  uuid UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(255),
  avatar_url TEXT,
  signin_provider VARCHAR(50),
  email_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 订单表
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  order_no VARCHAR(100) UNIQUE NOT NULL,
  user_uuid UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  paid_email VARCHAR(255),
  product_name VARCHAR(255),
  product_id VARCHAR(100),
  amount DECIMAL(10, 2),
  status VARCHAR(50) DEFAULT 'created',  -- created, paid, deleted
  interval VARCHAR(50),                  -- one-time, month, year
  stripe_session_id VARCHAR(255),
  order_detail JSONB,
  paid_detail JSONB,
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 视频生成任务表
CREATE TABLE video_generation_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  image_url TEXT,
  prompt TEXT,
  video_url TEXT,
  model VARCHAR(50),
  provider VARCHAR(50),
  duration INTEGER,
  status VARCHAR(50) DEFAULT 'pending',  -- pending, processing, completed, failed
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  replicate_prediction_id VARCHAR(255),
  external_task_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 音频生成任务表
CREATE TABLE audio_generation_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  video_url TEXT,
  prompt TEXT,
  audio_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  replicate_prediction_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 去水印任务表
CREATE TABLE watermark_removal_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  video_url TEXT,
  result_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 视频超分任务表
CREATE TABLE video_upscaler_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  video_url TEXT,
  result_url TEXT,
  target_resolution VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- AI特效任务表
CREATE TABLE video_effect_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  image_url TEXT,
  result_url TEXT,
  template_id VARCHAR(100),
  template_name VARCHAR(255),
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  wavespeed_task_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 人脸替换任务表
CREATE TABLE video_face_swap_tasks (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(uuid),
  user_email VARCHAR(255),
  face_image_url TEXT,
  video_url TEXT,
  result_video_url TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  credits_used INTEGER DEFAULT 0,
  error TEXT,
  wavespeed_task_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**索引优化**:

```sql
-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- 订单表索引
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_user_uuid ON orders(user_uuid);
CREATE INDEX idx_orders_paid_email ON orders(paid_email);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- 所有任务表统一索引
CREATE INDEX idx_tasks_user_id ON {table_name}(user_id);
CREATE INDEX idx_tasks_status ON {table_name}(status);
CREATE INDEX idx_tasks_created_at ON {table_name}(created_at DESC);
```

### 3. 类型定义

**文件路径**: `types/blocks/table.d.ts`

```typescript
export interface TableColumn {
  name?: string;              // 字段名
  title?: string;             // 列标题
  type?: string;              // 列类型（如 'copy'）
  options?: any[];            // 选项列表
  className?: string;         // 样式类名
  callback?: (item: any) => any;  // 自定义渲染函数
}

export interface Table {
  columns: TableColumn[];     // 表格列定义
  data: any[];                // 表格数据
}
```

**文件路径**: `types/slots/table.d.ts`

```typescript
export interface Table extends Slot {
  columns?: TableColumn[];
  empty_message?: string;     // 空数据提示
  pagination?: PaginationConfig;
}
```

---

## 最佳实践与设计模式

### 1. 分层架构

```
┌─────────────────────────────────────┐
│  Presentation Layer (页面层)         │
│  - app/[locale]/(admin)/admin/      │
│  - Server Components                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Service Layer (业务逻辑层)          │
│  - lib/admin/all-tasks-fetcher.ts   │
│  - 数据聚合、标准化、统计             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Model Layer (数据访问层)            │
│  - models/user.ts                   │
│  - models/order.ts                  │
│  - 直接数据库操作                    │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│  Database Layer (数据库层)           │
│  - Supabase PostgreSQL              │
└─────────────────────────────────────┘
```

**优势**:
- 职责清晰，易于维护
- 业务逻辑与数据访问分离
- 便于单元测试

### 2. Server Components 优先策略

```typescript
// ✅ 推荐：使用 Server Component
export default async function UsersPage() {
  const users = await getUsers(1, 50);
  return <TableSlot {...table} />;
}

// ❌ 避免：不必要的 Client Component
'use client';
export default function UsersPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    fetchUsers();
  }, []);
  return <TableSlot {...table} />;
}
```

**优势**:
- 减少客户端 JavaScript 体积
- 更快的首屏渲染
- 更好的 SEO

### 3. 游标分页 vs 传统分页

**游标分页（推荐）**:
```typescript
// 使用时间戳作为游标
const { tasks } = await fetchAllTasks({
  cursor: '2024-01-15T10:30:00.000Z',
  limit: 50
});

// 查询条件
query.lt('created_at', cursor).limit(limit + 1)
```

**优势**:
- 性能稳定，不受数据量影响
- 避免了传统分页的"丢失数据"问题
- 支持实时数据插入

**传统分页（不推荐）**:
```typescript
// 使用 offset
const offset = (page - 1) * limit;
query.range(offset, offset + limit - 1)
```

**劣势**:
- 大偏移量性能差
- 数据变化时可能跳过或重复

### 4. 多表并行查询优化

```typescript
// ✅ 推荐：并行查询
const results = await Promise.allSettled([
  queryTable1(),
  queryTable2(),
  queryTable3(),
]);

// ❌ 避免：串行查询
const table1 = await queryTable1();
const table2 = await queryTable2();
const table3 = await queryTable3();
```

**性能对比**:
- 并行查询：约 200ms（单表查询时间）
- 串行查询：约 600ms（3 × 200ms）

### 5. 数据标准化模式

```typescript
/**
 * Adapter 模式
 * 将不同表的数据统一转换为标准格式
 */
function normalizeTask(rawTask: any, taskType: TaskType): UnifiedTask {
  // 基础字段映射
  const base = {
    id: `${taskType}_${rawTask.id}`,
    task_type: taskType,
    status: rawTask.status,
    // ...
  };

  // 根据类型添加特定字段
  switch (taskType) {
    case 'video_generation':
      return { ...base, video_url: rawTask.video_url };
    case 'audio_generation':
      return { ...base, audio_url: rawTask.audio_url };
    // ...
  }
}
```

### 6. 组件复用策略

```typescript
/**
 * Slot 模式：统一的组件接口
 */
// 1. 定义统一的 Slot 接口
interface TableSlotType {
  title: string;
  columns: TableColumn[];
  data: any[];
}

// 2. 不同页面使用相同的组件
<TableSlot {...table} />

// 3. 通过 callback 自定义渲染
{
  name: "avatar_url",
  callback: (row) => <img src={row.avatar_url} />
}
```

### 7. 错误处理策略

```typescript
// Promise.allSettled 而不是 Promise.all
const results = await Promise.allSettled([...queries]);

results.forEach((result) => {
  if (result.status === 'fulfilled') {
    // 处理成功的结果
    allTasks.push(...result.value);
  } else {
    // 记录错误但不中断流程
    console.warn('Query failed:', result.reason);
  }
});
```

**优势**:
- 部分失败不影响整体
- 提高系统容错性

### 8. TypeScript 类型安全

```typescript
// 定义严格的类型
export type TaskType =
  | 'video_generation'
  | 'audio_generation'
  | 'watermark_removal'
  | 'video_upscaler'
  | 'video_effects'
  | 'face_swap';

// 使用类型守卫
function getTableName(taskType: TaskType): string {
  const mapping: Record<TaskType, string> = {
    video_generation: 'video_generation_tasks',
    // ...
  };
  return mapping[taskType];
}
```

### 9. 性能优化清单

- ✅ 使用 Edge Runtime 加速响应
- ✅ 数据库查询添加索引
- ✅ 使用游标分页避免大偏移
- ✅ 并行查询多表数据
- ✅ 使用 Server Components 减少客户端负担
- ✅ 图片/视频使用缩略图预览
- ✅ 合理使用 `limit + 1` 判断是否有更多数据

### 10. 代码组织建议

```
项目目录结构:
app/
  [locale]/(admin)/admin/
    users/page.tsx          # 用户管理页面
    paid-orders/page.tsx    # 订单管理页面
    tasks/page.tsx          # 任务管理页面

components/
  admin/                    # 管理后台专用组件
    tasks-list-with-pagination.tsx
    task-type-filter.tsx
    media-preview.tsx
  dashboard/slots/          # 可复用的 Slot 组件
    table/index.tsx
  blocks/                   # 基础 UI 组件
    table/index.tsx

lib/
  admin/                    # 管理后台业务逻辑
    all-tasks-fetcher.ts

models/                     # 数据访问层
  user.ts
  order.ts
  db.ts                     # Supabase 客户端

types/                      # TypeScript 类型定义
  blocks/table.d.ts
  slots/table.d.ts
```

---

## 总结

### 核心优势

1. **统一的架构模式**: 三个模块使用一致的实现方式
2. **高性能**: 游标分页 + 并行查询 + Edge Runtime
3. **可维护性**: 清晰的分层架构和类型安全
4. **可扩展性**: 易于添加新的任务类型或管理模块
5. **用户体验**: 实时加载更多 + 媒体预览 + 筛选功能

### 技术亮点

- **游标分页**: 避免传统分页的性能问题
- **多表聚合**: 统一管理6种不同类型的任务
- **数据标准化**: Adapter 模式统一不同表的数据格式
- **Server Components**: 最大化利用服务端渲染优势
- **类型安全**: 完整的 TypeScript 类型覆盖

### 适用场景

这套实现方案特别适合以下场景：

1. 需要管理多种类型数据的后台系统
2. 数据量较大需要分页的列表页面
3. 需要实时统计和筛选功能的管理界面
4. 基于 Supabase 的 Next.js 项目
5. 需要快速迭代的 SaaS 产品

---

*文档创建时间: 2024年*
*适用版本: Next.js 14, React 18, Supabase v2*
