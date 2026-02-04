/**
 * GET /api/video-agent/projects/[id]/storyboards/[shotNumber]/history
 *
 * 获取指定分镜的所有历史版本
 * 返回按版本号倒序的版本列表（最新版本在前）
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'

export async function GET(
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

    const supabase = createClient()

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

    // 调用数据库函数获取历史版本
    const { data: versions, error: historyError } = await supabase
      .rpc('get_storyboard_history', {
        p_project_id: projectId,
        p_shot_number: shotNum
      })

    if (historyError) {
      console.error('[Storyboard History] Database error:', historyError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch history' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: versions || []
    })
  } catch (error: any) {
    console.error('[Storyboard History] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
