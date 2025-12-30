/**
 * Video Agent - 步骤重置 API
 * POST: 从指定步骤重新开始，清空后续所有数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 从指定步骤重置项目
 * POST /api/video-agent/projects/[id]/reset-from-step
 *
 * Body:
 * {
 *   step: number  // 从哪个步骤开始重置（1-7）
 * }
 *
 * 功能：
 * - 清空指定步骤及之后的所有数据
 * - 重置步骤状态为 NULL
 * - 删除相关的关联数据（人物、分镜图、视频片段等）
 * - 将 current_step 重置为指定步骤
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id, current_step, status')
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

    // 解析请求体
    let body: {
      step: number
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { step } = body

    // 验证步骤编号
    if (
      typeof step !== 'number' ||
      step < 1 ||
      step > 7
    ) {
      return NextResponse.json(
        { error: 'Invalid step number. Must be between 1 and 7' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Resetting project from step', {
      projectId,
      fromStep: step,
      currentStep: project.current_step
    })

    // 调用数据库函数执行重置
    const { data: resetResult, error: resetError } = await supabaseAdmin
      .rpc('reset_project_from_step', {
        p_project_id: projectId,
        p_from_step: step
      })

    if (resetError) {
      console.error('[Video Agent] Failed to reset project:', resetError)
      return NextResponse.json(
        {
          error: 'Failed to reset project',
          details: resetError.message,
          code: 'RESET_FAILED'
        },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Project reset successfully', {
      projectId,
      fromStep: step,
      result: resetResult
    })

    // 重新获取更新后的项目数据
    const { data: updatedProject, error: fetchError } = await supabaseAdmin
      .from('video_agent_projects')
      .select(`
        *,
        project_characters (
          id,
          character_name,
          source,
          template_id,
          generation_prompt,
          character_reference_images (
            id,
            image_url,
            image_order
          )
        ),
        project_shots (
          id,
          shot_number,
          time_range,
          description,
          camera_angle,
          character_action,
          mood,
          duration_seconds
        ),
        project_storyboards (
          id,
          shot_number,
          image_url,
          status,
          error_message
        ),
        project_video_clips (
          id,
          shot_number,
          video_url,
          status,
          error_message,
          duration
        )
      `)
      .eq('id', projectId)
      .single()

    if (fetchError) {
      console.error('[Video Agent] Failed to fetch updated project:', fetchError)
    }

    return NextResponse.json({
      success: true,
      data: {
        project: updatedProject || null,
        resetResult,
        message: `Successfully reset project from step ${step}`
      }
    })

  } catch (error) {
    console.error('[Video Agent] Reset project error:', error)
    return NextResponse.json(
      {
        error: 'Failed to reset project',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})
