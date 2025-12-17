/**
 * Video Agent - 转场效果选择 API
 * POST: 保存转场效果选择 (步骤 5 - 音乐和转场)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 保存转场效果选择
 * POST /api/video-agent/projects/[id]/transition
 *
 * Body:
 * {
 *   type: 'fade' | 'crossfade' | 'dissolve' | 'slide' | 'zoom' | 'wipe' | 'none',  // 或使用 effect 字段
 *   duration: number  // 0.3 ~ 1.0 秒
 * }
 */
export async function POST(
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
      effect?: string
      type?: string  // 前端使用 type 字段
      duration: number
    }

    try {
      body = await request.json()
      console.log('[Video Agent] Received transition request body:', body)
    } catch (error) {
      console.error('[Video Agent] Failed to parse request body:', error)
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // 兼容 effect 和 type 两种字段名
    const effect = body.effect || body.type
    const { duration } = body

    // 验证转场效果
    const validEffects = ['fade', 'crossfade', 'dissolve', 'slide', 'zoom', 'wipe', 'none']
    if (!effect || !validEffects.includes(effect)) {
      console.error('[Video Agent] Invalid transition effect:', { effect, validEffects })
      return NextResponse.json(
        { error: `Invalid transition effect. Must be one of: ${validEffects.join(', ')}`, received: effect },
        { status: 400 }
      )
    }

    // 验证转场时长
    if (!duration || duration < 0.3 || duration > 1.0) {
      console.error('[Video Agent] Invalid transition duration:', { duration })
      return NextResponse.json(
        { error: 'Transition duration must be between 0.3 and 1.0 seconds', received: duration },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Saving transition selection', {
      projectId,
      effect,
      duration
    })

    // 更新项目转场配置
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        transition_effect: effect,
        transition_duration: duration,
        step_5_status: 'completed',  // 修复：Step 5（音乐和转场）
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('[Video Agent] Failed to save transition selection:', updateError)
      return NextResponse.json(
        { error: 'Failed to save transition selection', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Transition selection saved successfully', { projectId })

    return NextResponse.json({
      success: true,
      data: {
        effect,
        duration
      }
    })

  } catch (error) {
    console.error('[Video Agent] Save transition error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save transition selection',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
