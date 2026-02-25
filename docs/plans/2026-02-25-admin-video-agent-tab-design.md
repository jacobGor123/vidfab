# Admin Video Agent Tab 设计文档

## 背景

在 admin 后台新增「Video Agent」标签页，让管理员可以查看所有用户的 Video Agent 项目列表，并逐项目查看各阶段进度、人物参考图、分镜图和分镜视频。

## 需求确认

- **展开方式**：行内 Accordion（点击某行，下方展开项目详情）
- **操作**：纯只读，不需要任何管理操作
- **筛选**：按状态筛选（All / Draft / Processing / Completed / Failed）

---

## 技术方案

**方案选择：Server Component 列表 + 点击懒加载详情（方案 B）**

- Server Component 只查项目列表（`video_agent_projects` join `users` 获取邮件）
- Client Component 管理状态筛选和 Accordion 展开
- 点击展开时调用 Admin API 拉取该项目完整详情（characters / storyboards / clips）
- 与现有 admin 模式一致，避免首屏加载大量媒体数据

---

## 文件结构

```
app/(main)/admin/video-agent/
  page.tsx                                    ← Server Component，查项目列表

app/api/admin/video-agent/
  projects/[id]/detail/route.ts               ← Admin API，返回项目 characters + storyboards + clips

components/admin/video-agent/
  projects-list-client.tsx                    ← 状态筛选 + Accordion 列表（Client Component）
  project-detail-panel.tsx                    ← 展开后的详情面板，懒加载（Client Component）

components/admin/sidebar-nav.tsx              ← 新增 Video Agent 导航项
```

共新建 4 个文件，修改 1 个文件。

---

## 数据库涉及的表

| 表 | 用途 |
|---|---|
| `video_agent_projects` | 项目主表，包含状态、步骤、script_analysis |
| `users` | 关联查用户邮件 |
| `project_characters` | 人物配置（名称、来源） |
| `character_reference_images` | 人物参考图 URL |
| `project_storyboards` | 分镜图（只取 `is_current = true`） |
| `project_video_clips` | 分镜视频 URL |

---

## 页面设计

### 列表视图

顶部状态筛选按钮组：`All | Draft | Processing | Completed | Failed`

列表表格列：

| 列 | 数据来源 |
|---|---|
| User | `users.email` |
| Status | `video_agent_projects.status`（彩色 badge） |
| Step | `current_step`（显示 "Step N/7" + 步骤名称） |
| Shots | `script_analysis.shot_count` |
| Duration | `duration`（秒） |
| Created | `created_at` |
| 展开按钮 | 点击触发 Accordion |

### 展开详情面板（3个区块）

**① 步骤进度条**
Step 1~7 横向展示，每步用颜色标示状态：
- `pending` → 灰色
- `in_progress` → 蓝色（脉冲动画）
- `completed` → 绿色
- `failed` → 红色

步骤标签：`Script → Characters → Style → Storyboards → Videos → Music → Compose`

**② Characters（人物参考图）**
每个人物一张卡片：
- 人物名称
- 参考图横向缩略图（最多5张，`object-cover`）
- 无参考图时显示灰色占位

**③ Shots（分镜 + 视频）**
每个 shot 横向三栏卡片：
- **左**：shot 编号 badge、时间段、描述文字
- **中**：Storyboard 图（有则显示，无则灰色占位 + "Not generated" 文字）
- **右**：视频片段（有则 `<video autoPlay loop muted>` 静音自动播放，无则灰色占位）

---

## API 设计

### GET `/api/admin/video-agent/projects/[id]/detail`

**鉴权**：复用现有 `checkAdminAuth()`

**返回结构**：
```json
{
  "characters": [
    {
      "id": "uuid",
      "character_name": "Alice",
      "reference_images": [
        { "image_url": "...", "image_order": 1 }
      ]
    }
  ],
  "shots": [
    {
      "shot_number": 1,
      "time_range": "0-7s",
      "description": "...",
      "storyboard": { "image_url": "...", "status": "success" },
      "video_clip": { "video_url": "...", "status": "success" }
    }
  ]
}
```

**查询逻辑**：
1. 查 `project_characters` + `character_reference_images`（按 image_order 排序）
2. 查 `project_shots`（按 shot_number 排序）
3. 查 `project_storyboards`（`is_current = true`，按 shot_number）
4. 查 `project_video_clips`（按 shot_number）
5. 将 storyboard 和 video_clip 按 shot_number 合并到 shots 数据中

---

## 约束

- 所有数据库查询使用 `supabaseAdmin` 绕过 RLS
- 不暴露任何写操作
- 项目列表默认按 `created_at DESC` 排序，取最近 200 条
- 图片/视频显示使用 `<img>` / `<video>` 原生标签，不依赖 Next.js `<Image>`（避免域名白名单问题）
