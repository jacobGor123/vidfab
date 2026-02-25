/**
 * Video Agent Projects List Client Component
 * 状态筛选按钮组 + Accordion 项目列表
 */

'use client';

import { useState } from 'react';
import ProjectDetailPanel from './project-detail-panel';

type ProjectStatus = 'all' | 'draft' | 'processing' | 'completed' | 'failed';
type SourceType = 'video_replication' | 'script_creation' | 'unknown';

interface Project {
  id: string;
  user_email: string | null;
  status: string;
  source_type: SourceType;
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

const SOURCE_BADGE: Record<SourceType, { label: string; className: string }> = {
  video_replication: { label: 'Video', className: 'bg-purple-100 text-purple-700 border-purple-200' },
  script_creation:   { label: 'Script', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
  unknown:           { label: '?', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

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
      <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* 表头 */}
        <div className="grid grid-cols-[1fr_80px_100px_120px_60px_70px_140px_40px] gap-3 px-4 py-3 bg-gradient-to-r from-purple-50 via-blue-50 to-cyan-50 border-b border-gray-200 font-semibold text-gray-800 text-sm">
          <span>User</span>
          <span>Source</span>
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
            <div key={project.id} className="border-b border-gray-200 last:border-b-0">
              {/* 行 */}
              <div
                className={`grid grid-cols-[1fr_80px_100px_120px_60px_70px_140px_40px] gap-3 px-4 py-3 items-center text-sm cursor-pointer hover:bg-purple-50/50 transition-colors ${
                  isExpanded ? 'bg-purple-50/50' : ''
                }`}
                onClick={() => toggleExpand(project.id)}
              >
                <span className="text-gray-700 truncate font-medium">
                  {project.user_email ?? <span className="text-gray-400 italic">Unknown</span>}
                </span>

                <span>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                      SOURCE_BADGE[project.source_type ?? 'unknown'].className
                    }`}
                  >
                    {SOURCE_BADGE[project.source_type ?? 'unknown'].label}
                  </span>
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
