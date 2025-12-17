/**
 * Video Agent - 步骤管理 API
 * PATCH: 更新当前步骤编号
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 更新当前步骤
 * PATCH /api/video-agent/projects/[id]/step
 *
 * Body:
 * {
 *   current_step: number  // 1-6
 * }
 */
export async function PATCH(
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

    // 解析请求体
    let body: {
      current_step: number
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { current_step } = body

    // 验证步骤编号
    if (
      typeof current_step !== 'number' ||
      current_step < 0 ||
      current_step > 7
    ) {
      return NextResponse.json(
        { error: 'Invalid current_step. Must be between 0 and 7' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Updating current step', {
      projectId,
      current_step
    })

    // 更新当前步骤
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        current_step,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('[Video Agent] Failed to update current step:', updateError)
      return NextResponse.json(
        { error: 'Failed to update current step', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Current step updated successfully', {
      projectId,
      current_step
    })

    return NextResponse.json({
      success: true,
      data: {
        current_step
      }
    })

  } catch (error) {
    console.error('[Video Agent] Update current step error:', error)
    return NextResponse.json(
      {
        error: 'Failed to update current step',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
