/**
 * 管理员 API：重置卡住的合成任务
 *
 * 用途：手动恢复 processing 状态但队列中无任务的项目
 *
 * POST /api/video-agent/admin/reset-stuck-job
 * Body: { projectId: string }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: NextRequest) {
  try {
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json(
        { success: false, error: 'projectId is required' },
        { status: 400 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 1. 查询项目当前状态
    const { data: project, error: fetchError } = await supabase
      .from('video_agent_projects')
      .select('id, status, step_6_status')
      .eq('id', projectId)
      .single()

    if (fetchError || !project) {
      return NextResponse.json(
        { success: false, error: 'Project not found' },
        { status: 404 }
      )
    }

    console.log(`[Admin] Resetting stuck job for project ${projectId}`, {
      currentStatus: project.status,
      currentStep6: project.step_6_status
    })

    // 2. 重置状态为 failed，允许用户重新触发
    const { error: updateError } = await supabase
      .from('video_agent_projects')
      .update({
        status: 'failed',
        step_6_status: 'failed',
      })
      .eq('id', projectId)

    if (updateError) {
      console.error(`[Admin] Failed to reset project ${projectId}:`, updateError)
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      )
    }

    console.log(`[Admin] ✅ Successfully reset project ${projectId} to failed state`)

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        message: 'Project reset to failed state. User can retry composition.',
        previousStatus: {
          status: project.status,
          step_6_status: project.step_6_status
        },
        newStatus: {
          status: 'failed',
          step_6_status: 'failed'
        }
      }
    })

  } catch (error) {
    console.error('[Admin] Error resetting stuck job:', error)
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    )
  }
}
