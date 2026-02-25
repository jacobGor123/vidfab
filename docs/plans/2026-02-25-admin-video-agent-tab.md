# Admin Video Agent Tab Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在 admin 后台新增 Video Agent 标签页，展示所有用户的项目列表，支持按状态筛选，点击行内展开查看步骤进度、人物参考图和分镜图/视频。

**Architecture:** Server Component 查项目列表（join users 获取邮件），Client Component 管理筛选和 Accordion，点击展开时调 Admin API 懒加载该项目的 characters / storyboards / clips。

**Tech Stack:** Next.js 15 App Router, Supabase Admin Client, React Client Components, Tailwind CSS

---

## Task 1: Admin Detail API Route

**Files:**
- Create: `app/api/admin/video-agent/projects/[id]/detail/route.ts`

**Step 1: 创建文件，写鉴权 + 基础结构**

```typescript
/**
 * Admin Video Agent Project Detail API
 * GET /api/admin/video-agent/projects/[id]/detail
 * 返回项目的 characters（含参考图）、shots（含分镜图和视频）
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';
import { getSupabaseAdminClient } from '@/models/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin();
    const supabase = getSupabaseAdminClient();
    const projectId = params.id;

    // 1. 查人物 + 参考图
    const { data: characters, error: charError } = await supabase
      .from('project_characters')
      .select(`
        id,
        character_name,
        source,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (charError) throw charError;

    // 2. 查 shots
    const { data: shots, error: shotsError } = await supabase
      .from('project_shots')
      .select('shot_number, time_range, description, duration_seconds')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true });

    if (shotsError) throw shotsError;

    // 3. 查当前版本分镜图
    const { data: storyboards, error: sbError } = await supabase
      .from('project_storyboards')
      .select('shot_number, image_url, status')
      .eq('project_id', projectId)
      .eq('is_current', true);

    if (sbError) throw sbError;

    // 4. 查视频片段
    const { data: clips, error: clipError } = await supabase
      .from('project_video_clips')
      .select('shot_number, video_url, status')
      .eq('project_id', projectId);

    if (clipError) throw clipError;

    // 5. 合并 shots + storyboards + clips
    const sbMap = new Map((storyboards ?? []).map((s: any) => [s.shot_number, s]));
    const clipMap = new Map((clips ?? []).map((c: any) => [c.shot_number, c]));

    const shotsWithMedia = (shots ?? []).map((shot: any) => ({
      ...shot,
      storyboard: sbMap.get(shot.shot_number) ?? null,
      video_clip: clipMap.get(shot.shot_number) ?? null,
    }));

    // 6. 排序参考图
    const charactersWithSortedImages = (characters ?? []).map((char: any) => ({
      ...char,
      reference_images: (char.character_reference_images ?? [])
        .sort((a: any, b: any) => a.image_order - b.image_order),
    }));

    return NextResponse.json({
      success: true,
      characters: charactersWithSortedImages,
      shots: shotsWithMedia,
    });
  } catch (error: any) {
    if (error?.message?.includes('Unauthorized')) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[Admin] Video agent detail error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch detail' }, { status: 500 });
  }
}
```

**Step 2: 验证文件可以被 TypeScript 编译**

```bash
npx tsc --noEmit 2>&1 | grep "video-agent/projects"
```

期望：无输出（无错误）

**Step 3: Commit**

```bash
git add app/api/admin/video-agent/projects/[id]/detail/route.ts
git commit -m "feat: 新增 admin video-agent 项目详情 API"
```

---

## Task 2: Project Detail Panel Component

**Files:**
- Create: `components/admin/video-agent/project-detail-panel.tsx`

**Step 1: 创建组件文件**

```typescript
/**
 * Video Agent Project Detail Panel
 * 展开后懒加载并渲染项目详情：步骤进度、人物参考图、分镜图/视频
 */

'use client';

import { useEffect, useState } from 'react';

interface ReferenceImage {
  image_url: string;
  image_order: number;
}

interface Character {
  id: string;
  character_name: string;
  source: string;
  reference_images: ReferenceImage[];
}

interface Storyboard {
  image_url: string | null;
  status: string;
}

interface VideoClip {
  video_url: string | null;
  status: string;
}

interface Shot {
  shot_number: number;
  time_range: string | null;
  description: string | null;
  duration_seconds: number | null;
  storyboard: Storyboard | null;
  video_clip: VideoClip | null;
}

interface DetailData {
  characters: Character[];
  shots: Shot[];
}

interface Props {
  projectId: string;
  stepStatuses: Record<string, string>; // step_1_status ~ step_7_status
}

const STEP_LABELS = ['Script', 'Characters', 'Style', 'Storyboards', 'Videos', 'Music', 'Compose'];

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-green-500 text-white',
  in_progress: 'bg-blue-500 text-white animate-pulse',
  failed: 'bg-red-500 text-white',
  pending: 'bg-gray-200 text-gray-500',
};

export default function ProjectDetailPanel({ projectId, stepStatuses }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/video-agent/projects/${projectId}/detail`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || 'Failed to load');
        }
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [projectId]);

  if (loading) {
    return (
      <div className="p-6 text-center text-gray-400 text-sm animate-pulse">
        Loading project details...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-red-500 text-sm">{error}</div>
    );
  }

  if (!data) return null;

  return (
    <div className="bg-gray-50 border-t border-gray-200 p-6 space-y-6">

      {/* ① 步骤进度条 */}
      <div>
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Step Progress
        </h3>
        <div className="flex gap-2 flex-wrap">
          {STEP_LABELS.map((label, i) => {
            const stepKey = `step_${i + 1}_status`;
            const status = stepStatuses[stepKey] || 'pending';
            return (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className={`px-3 py-1.5 rounded-full text-xs font-medium ${STATUS_STYLES[status] ?? STATUS_STYLES.pending}`}
                >
                  {i + 1}. {label}
                </div>
                <span className="text-[10px] text-gray-400 capitalize">{status}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ② Characters */}
      {data.characters.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Characters ({data.characters.length})
          </h3>
          <div className="flex gap-4 flex-wrap">
            {data.characters.map((char) => (
              <div key={char.id} className="bg-white border border-gray-200 rounded-lg p-3 min-w-[160px]">
                <p className="text-sm font-medium text-gray-800 mb-2 truncate">{char.character_name}</p>
                <div className="flex gap-1 flex-wrap">
                  {char.reference_images.length > 0 ? (
                    char.reference_images.map((img, idx) => (
                      <img
                        key={idx}
                        src={img.image_url}
                        alt={`${char.character_name} ref ${img.image_order}`}
                        className="w-14 h-14 object-cover rounded border border-gray-100"
                      />
                    ))
                  ) : (
                    <div className="w-14 h-14 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">No img</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ③ Shots */}
      {data.shots.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Shots ({data.shots.length})
          </h3>
          <div className="space-y-3">
            {data.shots.map((shot) => (
              <div
                key={shot.shot_number}
                className="bg-white border border-gray-200 rounded-lg p-3 flex gap-4 items-start"
              >
                {/* 左：Shot 信息 */}
                <div className="w-40 shrink-0">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-xs font-bold mb-1">
                    {shot.shot_number}
                  </span>
                  {shot.time_range && (
                    <p className="text-[10px] text-gray-400 mb-1">{shot.time_range}</p>
                  )}
                  <p className="text-xs text-gray-600 line-clamp-3">{shot.description}</p>
                </div>

                {/* 中：分镜图 */}
                <div className="shrink-0">
                  <p className="text-[10px] text-gray-400 mb-1">Storyboard</p>
                  {shot.storyboard?.image_url ? (
                    <img
                      src={shot.storyboard.image_url}
                      alt={`Shot ${shot.shot_number} storyboard`}
                      className="w-32 h-20 object-cover rounded border border-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">
                        {shot.storyboard?.status === 'failed' ? 'Failed' : 'Not generated'}
                      </span>
                    </div>
                  )}
                </div>

                {/* 右：视频片段 */}
                <div className="shrink-0">
                  <p className="text-[10px] text-gray-400 mb-1">Video Clip</p>
                  {shot.video_clip?.video_url ? (
                    <video
                      src={shot.video_clip.video_url}
                      autoPlay
                      loop
                      muted
                      playsInline
                      className="w-32 h-20 object-cover rounded border border-gray-100"
                    />
                  ) : (
                    <div className="w-32 h-20 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-[10px] text-gray-400">
                        {shot.video_clip?.status === 'failed' ? 'Failed' : 'Not generated'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 确认 TypeScript 无错误**

```bash
npx tsc --noEmit 2>&1 | grep "project-detail-panel"
```

期望：无输出

**Step 3: Commit**

```bash
git add components/admin/video-agent/project-detail-panel.tsx
git commit -m "feat: 新增 ProjectDetailPanel 组件（展开详情面板）"
```

---

## Task 3: Projects List Client Component

**Files:**
- Create: `components/admin/video-agent/projects-list-client.tsx`

**Step 1: 创建组件文件**

```typescript
/**
 * Video Agent Projects List Client Component
 * 状态筛选按钮组 + Accordion 项目列表
 */

'use client';

import { useState } from 'react';
import ProjectDetailPanel from './project-detail-panel';

type ProjectStatus = 'all' | 'draft' | 'processing' | 'completed' | 'failed';

interface Project {
  id: string;
  user_email: string | null;
  status: string;
  current_step: number;
  duration: number | null;
  aspect_ratio: string | null;
  script_analysis: any;
  step_1_status: string;
  step_2_status: string;
  step_3_status: string;
  step_4_status: string;
  step_5_status: string;
  step_6_status: string;
  step_7_status: string;
  created_at: string;
}

interface Props {
  projects: Project[];
}

const STATUS_FILTERS: { value: ProjectStatus; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const STATUS_BADGE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const STEP_NAMES: Record<number, string> = {
  0: 'Not started',
  1: 'Script',
  2: 'Characters',
  3: 'Style',
  4: 'Storyboards',
  5: 'Videos',
  6: 'Music',
  7: 'Compose',
};

export default function ProjectsListClient({ projects }: Props) {
  const [activeFilter, setActiveFilter] = useState<ProjectStatus>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = activeFilter === 'all'
    ? projects
    : projects.filter((p) => p.status === activeFilter);

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div>
      {/* 状态筛选按钮组 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setActiveFilter(f.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeFilter === f.value
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-purple-300 hover:text-purple-600'
            }`}
          >
            {f.label}
            <span className="ml-1 opacity-70">
              ({f.value === 'all'
                ? projects.length
                : projects.filter((p) => p.status === f.value).length})
            </span>
          </button>
        ))}
      </div>

      {/* 项目列表 */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-[1fr_100px_120px_60px_70px_140px_40px] gap-3 px-4 py-2 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <span>User</span>
          <span>Status</span>
          <span>Step</span>
          <span>Shots</span>
          <span>Duration</span>
          <span>Created</span>
          <span></span>
        </div>

        {filtered.length === 0 && (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">No projects found.</div>
        )}

        {filtered.map((project) => {
          const isExpanded = expandedId === project.id;
          const shotCount = project.script_analysis?.shot_count ?? '—';
          const stepStatuses = {
            step_1_status: project.step_1_status,
            step_2_status: project.step_2_status,
            step_3_status: project.step_3_status,
            step_4_status: project.step_4_status,
            step_5_status: project.step_5_status,
            step_6_status: project.step_6_status,
            step_7_status: project.step_7_status,
          };

          return (
            <div key={project.id} className="border-b border-gray-100 last:border-b-0">
              {/* 行 */}
              <div
                className={`grid grid-cols-[1fr_100px_120px_60px_70px_140px_40px] gap-3 px-4 py-3 items-center text-sm cursor-pointer hover:bg-purple-50 transition-colors ${
                  isExpanded ? 'bg-purple-50' : ''
                }`}
                onClick={() => toggleExpand(project.id)}
              >
                <span className="text-gray-700 truncate font-medium">
                  {project.user_email ?? <span className="text-gray-400 italic">Unknown</span>}
                </span>

                <span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border capitalize ${
                      STATUS_BADGE[project.status] ?? STATUS_BADGE.draft
                    }`}
                  >
                    {project.status}
                  </span>
                </span>

                <span className="text-gray-600 text-xs">
                  Step {project.current_step}/7
                  <span className="text-gray-400 ml-1">
                    {STEP_NAMES[project.current_step] ?? ''}
                  </span>
                </span>

                <span className="text-gray-500 text-xs">{shotCount}</span>

                <span className="text-gray-500 text-xs">
                  {project.duration ? `${project.duration}s` : '—'}
                </span>

                <span className="text-gray-400 text-xs">
                  {new Date(project.created_at).toLocaleDateString()}{' '}
                  {new Date(project.created_at).toLocaleTimeString()}
                </span>

                <span className={`text-gray-400 text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
              </div>

              {/* 展开详情 */}
              {isExpanded && (
                <ProjectDetailPanel
                  projectId={project.id}
                  stepStatuses={stepStatuses}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

**Step 2: 确认 TypeScript 无错误**

```bash
npx tsc --noEmit 2>&1 | grep "projects-list-client"
```

期望：无输出

**Step 3: Commit**

```bash
git add components/admin/video-agent/projects-list-client.tsx
git commit -m "feat: 新增 ProjectsListClient 组件（筛选 + Accordion）"
```

---

## Task 4: Video Agent Admin Page

**Files:**
- Create: `app/(main)/admin/video-agent/page.tsx`

**Step 1: 创建 page.tsx**

```typescript
/**
 * Admin Video Agent Projects Page
 * Server Component: 查所有用户的 video_agent_projects，join users 获取邮件
 */

import { getSupabaseAdminClient } from '@/models/db';
import ProjectsListClient from '@/components/admin/video-agent/projects-list-client';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VideoAgentAdminPage() {
  const supabase = getSupabaseAdminClient();

  // 查最近 200 条项目，同时查用户邮件
  const { data: projects, error } = await supabase
    .from('video_agent_projects')
    .select(`
      id,
      user_id,
      status,
      current_step,
      duration,
      aspect_ratio,
      script_analysis,
      step_1_status,
      step_2_status,
      step_3_status,
      step_4_status,
      step_5_status,
      step_6_status,
      step_7_status,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 text-sm">Failed to load projects: {error.message}</p>
      </div>
    );
  }

  // 批量查用户邮件
  const userIds = [...new Set((projects ?? []).map((p: any) => p.user_id).filter(Boolean))];
  let emailMap = new Map<string, string>();

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('uuid, email')
      .in('uuid', userIds);

    emailMap = new Map((users ?? []).map((u: any) => [u.uuid, u.email]));
  }

  // 合并邮件
  const projectsWithEmail = (projects ?? []).map((p: any) => ({
    ...p,
    user_email: emailMap.get(p.user_id) ?? null,
  }));

  const total = projectsWithEmail.length;
  const completedCount = projectsWithEmail.filter((p: any) => p.status === 'completed').length;
  const processingCount = projectsWithEmail.filter((p: any) => p.status === 'processing').length;

  return (
    <div>
      {/* 统计摘要 */}
      <div className="flex gap-4 mb-6">
        {[
          { label: 'Total Projects', value: total, color: 'text-gray-800' },
          { label: 'Completed', value: completedCount, color: 'text-green-600' },
          { label: 'Processing', value: processingCount, color: 'text-blue-600' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg px-5 py-3">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <ProjectsListClient projects={projectsWithEmail} />
    </div>
  );
}
```

**Step 2: 确认 TypeScript 无错误**

```bash
npx tsc --noEmit 2>&1 | grep "video-agent/page"
```

期望：无输出

**Step 3: Commit**

```bash
git add app/(main)/admin/video-agent/page.tsx
git commit -m "feat: 新增 admin video-agent 项目列表页（Server Component）"
```

---

## Task 5: 侧边栏导航新增 Video Agent

**Files:**
- Modify: `components/admin/sidebar-nav.tsx`

**Step 1: 在 navItems 数组末尾新增一项**

在 `Discover` 那一项之后，插入：

```typescript
{
  href: '/admin/video-agent',
  label: 'Video Agent',
  icon: (
    <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
    </svg>
  ),
},
```

**Step 2: 确认 TypeScript 无错误**

```bash
npx tsc --noEmit 2>&1 | grep "sidebar-nav"
```

期望：无输出

**Step 3: Commit**

```bash
git add components/admin/sidebar-nav.tsx
git commit -m "feat: 侧边栏新增 Video Agent 导航项"
```

---

## Task 6: 整体验证与推送

**Step 1: 完整 TypeScript 检查（仅看新增文件）**

```bash
npx tsc --noEmit 2>&1 | grep -E "video-agent|sidebar-nav|project-detail|projects-list" | grep -v "node_modules" | grep -v ".next"
```

期望：无输出

**Step 2: 本地启动验证**

```bash
bash scripts/dev.sh
```

访问 `http://localhost:3000/admin/video-agent`，检查：
- [ ] 侧边栏出现 Video Agent 导航项
- [ ] 页面显示统计摘要（Total / Completed / Processing）
- [ ] 状态筛选按钮正常切换
- [ ] 点击某行展开，显示 Loading → 详情（步骤进度 + Characters + Shots）
- [ ] 有分镜图的项目能正常显示图片
- [ ] 有视频片段的项目能正常播放视频

**Step 3: 推送**

```bash
git push
```
