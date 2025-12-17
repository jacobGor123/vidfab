/**
 * Video Agent - 分镜图状态查询 API
 * GET: 查询所有分镜图的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

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
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 验证用户身份
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      )
    }

    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== session.user.uuid) {
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
    const successCount = storyboards.filter(sb => sb.status === 'success').length
    const generatingCount = storyboards.filter(sb => sb.status === 'generating').length
    const failedCount = storyboards.filter(sb => sb.status === 'failed').length

    // 检查是否全部完成
    if (successCount + failedCount === storyboards.length && generatingCount === 0) {
      // 更新项目状态
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: 'completed',  // Step 3 完成
          // 不更新 current_step，由前端在用户点击"继续"时更新
        })
        .eq('id', projectId)
    }

    // 直接返回数组，字段名使用下划线（匹配数据库和前端）
    return NextResponse.json({
      success: true,
      data: storyboards.map(sb => ({
        id: sb.id,
        shot_number: sb.shot_number,
        image_url: sb.image_url,
        status: sb.status,
        task_id: sb.task_id,
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
}
