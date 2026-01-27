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
    let { data: storyboards, error: storyboardsError } = await supabaseAdmin
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

    // 统计状态（注意：后面可能会在 dev 模式下更新 stuck 分镜图并重拉数据）
    let successCount = storyboards.filter(sb => sb.status === 'success').length
    let generatingCount = storyboards.filter(sb => sb.status === 'generating').length
    let failedCount = storyboards.filter(sb => sb.status === 'failed').length

    // NOTE: Previously we had a dev-only "auto-fail stuck generating" soft-finalizer.
    // It proved too aggressive and could incorrectly mark legitimate in-flight tasks as failed.
    // For now we disable any server-side auto-fail here; failures should be driven by the worker
    // (or explicit user retry actions), not by a polling endpoint.

    // 检查是否全部完成
    if (successCount + failedCount === storyboards.length && generatingCount === 0) {
      // 更新项目状态
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: 'completed',  // Step 3 完成
          // 不更新 current_step，由前端在用户点击"继续"时更新
        } as any)
        .eq('id', projectId)
        .returns<any>()
    }

    // 直接返回数组，字段名使用下划线（匹配数据库和前端）
    // 🔥 返回所有URL字段，让前端根据 storage_status 智能选择（混合方案）
    return NextResponse.json({
      success: true,
      data: storyboards.map(sb => ({
        id: sb.id,
        shot_number: sb.shot_number,
        image_url: sb.image_url,  // 原始URL（通常是CDN）
        image_url_external: sb.image_url_external,  // 外部URL（BytePlus返回）
        cdn_url: sb.cdn_url,  // 稳定的CDN URL
        storage_path: sb.storage_path,
        storage_status: sb.storage_status,  // 前端据此判断用哪个URL
        file_size: sb.file_size,
        status: sb.status,
        seedream_task_id: sb.seedream_task_id,
        error_message: sb.error_message,
        created_at: sb.created_at,
        updated_at: sb.updated_at
      }))
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
