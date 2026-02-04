/**
 * POST /api/video-agent/projects/[id]/storyboards/[shotNumber]/switch-version
 *
 * 切换到指定的历史版本
 * Body: { version: number }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; shotNumber: string }> }
) {
  try {
    const { id: projectId, shotNumber } = await context.params
    const shotNum = parseInt(shotNumber, 10)

    if (isNaN(shotNum)) {
      return NextResponse.json(
        { success: false, error: 'Invalid shot number' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { version } = body

    if (typeof version !== 'number') {
      return NextResponse.json(
        { success: false, error: 'Version number is required' },
        { status: 400 }
      )
    }

    const supabase = await createServerClient()

    // 获取当前用户
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 验证项目所有权
    const { data: project, error: projectError } = await supabase
      .from('video_agent_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', user.id)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 调用数据库函数切换版本
    const { data: result, error: switchError } = await supabase
      .rpc('switch_to_storyboard_version', {
        p_project_id: projectId,
        p_shot_number: shotNum,
        p_version: version
      })

    if (switchError) {
      console.error('[Storyboard Switch] Database error:', switchError)
      return NextResponse.json(
        { success: false, error: 'Failed to switch version' },
        { status: 500 }
      )
    }

    if (!result) {
      return NextResponse.json(
        { success: false, error: 'Version not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Version switched successfully'
    })
  } catch (error: any) {
    console.error('[Storyboard Switch] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
