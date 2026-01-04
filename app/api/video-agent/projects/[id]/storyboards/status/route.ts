/**
 * Video Agent - 分镜图状态查询 API
 * GET: 查询所有分镜图的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectStoryboard = Database['public']['Tables']['project_storyboards']['Row']

/**
 * 查询分镜图生成状态
 * GET /api/video-agent/projects/[id]/storyboards/status
 *
 * 返回格式:
 * {
 *   success: true,
 *   data: {
 *     totalStoryboards: 6,
 *     success: 5,
 *     generating: 1,
 *     failed: 0,
 *     storyboards: [...]
 *   }
 * }
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // 获取所有分镜图
    const { data: storyboards, error: storyboardsError } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })
      .returns<ProjectStoryboard[]>()

    if (storyboardsError) {
      console.error('[Video Agent] Failed to fetch storyboards:', storyboardsError)
      return NextResponse.json(
        { error: 'Failed to fetch storyboards' },
        { status: 500 }
      )
    }

    if (!storyboards || storyboards.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 统计状态
    const total = storyboards.length
    const successCount = storyboards.filter(sb => sb.status === 'success').length
    const generatingCount = storyboards.filter(sb => sb.status === 'generating').length
    const failedCount = storyboards.filter(sb => sb.status === 'failed').length

    const allCompleted = successCount + failedCount === total && generatingCount === 0
    const finalStatus =
      allCompleted
        ? (failedCount === 0 ? 'completed' : failedCount === total ? 'failed' : 'partial')
        : 'processing'

    // 如果已全部完成，更新项目状态（与 Inngest 侧 finalStatus 保持一致）
    if (allCompleted) {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: finalStatus,
          // 不更新 current_step，由前端在用户点击"继续"时更新
        } as any)
        .eq('id', projectId)
        .returns<any>()
    }

    const mapped = storyboards.map(sb => ({
      id: sb.id,
      shot_number: sb.shot_number,
      image_url: sb.image_url,
      status: sb.status,
      task_id: sb.task_id,
      error_message: sb.error_message,
      created_at: sb.created_at,
      updated_at: sb.updated_at
    }))

    // 兼容：data 仍然返回数组（不破坏现有前端和 e2e 脚本）
    // 增强：额外返回 meta 聚合字段，供前端展示和调试
    return NextResponse.json({
      success: true,
      data: mapped,
      meta: {
        status: finalStatus,
        total,
        success: successCount,
        generating: generatingCount,
        failed: failedCount,
        allCompleted
      }
    })

  } catch (error) {
    console.error('[Video Agent] Storyboard status check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check storyboard status',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})
