/**
 * Video Agent - 图片风格选择 API
 * POST: 保存图片风格选择 (步骤 3)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 保存图片风格选择
 * POST /api/video-agent/projects/[id]/image-style
 *
 * Body:
 * {
 *   styleId: 'realistic' | 'anime' | 'cinematic' | 'cyberpunk'
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
      styleId: string
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    const { styleId } = body

    // 验证风格 ID
    const validStyles = ['realistic', 'anime', 'cinematic', 'cyberpunk']
    if (!styleId || !validStyles.includes(styleId)) {
      return NextResponse.json(
        { error: `Invalid style ID. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Saving image style selection', {
      projectId,
      styleId
    })

    // 更新项目图片风格
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        image_style_id: styleId,
        step_3_status: 'completed',
        // 不更新 current_step，由前端在用户点击"继续"时更新
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('[Video Agent] Failed to save image style:', updateError)
      return NextResponse.json(
        { error: 'Failed to save image style', details: updateError.message },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Image style saved successfully', { projectId })

    return NextResponse.json({
      success: true,
      data: {
        styleId
      }
    })

  } catch (error) {
    console.error('[Video Agent] Save image style error:', error)
    return NextResponse.json(
      {
        error: 'Failed to save image style',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
