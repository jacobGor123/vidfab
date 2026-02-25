/**
 * Admin Video Agent Projects Page
 * Server Component: 查所有用户的 video_agent_projects，join users 获取邮件
 */

import { getSupabaseAdminClient } from '@/models/db';
import ProjectsListClient from '@/components/admin/video-agent/projects-list-client';

type SourceType = 'video_replication' | 'script_creation' | 'unknown';

/** 根据 original_script 内容模式推断任务来源：
 *  analyze-video 路由自动生成的脚本每段都以 "Shot N:" 开头；
 *  用户手写脚本则是自由格式。
 */
function inferSourceType(originalScript: string | null): SourceType {
  if (!originalScript?.trim()) return 'unknown';
  const parts = originalScript.trim().split(/\n\n+/).filter(Boolean);
  if (parts.length > 0 && parts.every((p) => /^Shot \d+:/.test(p.trim()))) {
    return 'video_replication';
  }
  return 'script_creation';
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function VideoAgentAdminPage() {
  const supabase = getSupabaseAdminClient();

  const { data: projects, error } = await supabase
    .from('video_agent_projects')
    .select(`
      id,
      user_id,
      status,
      current_step,
      duration,
      aspect_ratio,
      original_script,
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

  const projectsWithEmail = (projects ?? []).map((p: any) => {
    const { original_script, ...rest } = p;
    return {
      ...rest,
      user_email: emailMap.get(p.user_id) ?? null,
      source_type: inferSourceType(original_script),
    };
  });

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
          <div key={stat.label} className="bg-white border border-gray-200 rounded-lg shadow-sm px-5 py-3">
            <p className="text-xs text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <ProjectsListClient projects={projectsWithEmail} />
    </div>
  );
}
