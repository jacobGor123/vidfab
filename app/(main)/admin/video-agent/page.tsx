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
