/**
 * Video Agent - 视频合成 API
 * POST: 开始合成最终视频 (步骤 6 - Final Composition)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { videoQueueManager } from '@/lib/queue/queue-manager'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

/**
 * 开始合成最终视频
 * POST /api/video-agent/projects/[id]/compose
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] ❌ Project not found', { projectError })
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查是否已完成视频生成 (Step 4)
    if (!project.step_4_status || project.step_4_status !== 'completed') {
      console.error('[Video Agent] Videos not ready', {
        step_4_status: project.step_4_status,
        current_step: project.current_step
      })
      return NextResponse.json(
        { error: 'Videos must be generated first', code: 'VIDEOS_NOT_READY' },
        { status: 400 }
      )
    }

    // 获取所有已完成的视频片段
    const { data: videoClips, error: clipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'success')  // 修复：使用 'success' 而不是 'completed'
      .order('shot_number', { ascending: true })
      .returns<ProjectVideoClip[]>()

    if (clipsError || !videoClips || videoClips.length === 0) {
      console.error('[Video Agent] ❌ No completed video clips found', {
        clipsError,
        videoClipsCount: videoClips?.length || 0
      })
      return NextResponse.json(
        { error: 'No completed video clips found', code: 'NO_CLIPS' },
        { status: 400 }
      )
    }

    // 获取分镜脚本以获取时长信息
    const { data: shots } = await supabaseAdmin
      .from('project_shots')
      .select('shot_number, duration_seconds')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })
      .returns<Pick<ProjectShot, 'shot_number' | 'duration_seconds'>[]>()

    // 构建 VideoClip 对象
    const clips: VideoClip[] = videoClips.map(clip => {
      const shot = shots?.find(s => s.shot_number === clip.shot_number)
      return {
        shot_number: clip.shot_number,
        video_url: clip.video_url!,
        duration: shot?.duration_seconds || 5
      }
    })

    // 更新项目状态为 queued (compose job will move it to processing)
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'processing',
        step_6_status: 'queued'  // Step 6（最终合成）排队中
        // 不更新 current_step，由前端在用户点击"继续"时更新
      } as any)
      .eq('id', projectId)
      .returns<any>()

    if (updateError) {
      console.error('[Video Agent] ❌ Failed to update project status:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update project status',
          code: 'UPDATE_FAILED',
          details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        },
        { status: 500 }
      )
    }

    // Enqueue compose job (reliable in worker)
    const now = new Date().toISOString()
    const composeJobId = `va:compose:${projectId}`
    const queuedId = await videoQueueManager.addJob(
      'va_compose_video',
      {
        type: 'va_compose_video',
        jobId: composeJobId,
        userId,
        videoId: projectId,
        projectId,
        createdAt: now,
      } as any,
      {
        priority: 'normal',
        attempts: 3,
        backoff: { type: 'exponential', delay: 10000 },
      }
    )

    return NextResponse.json({
      success: true,
      data: {
        message: 'Video composition queued',
        totalClips: clips.length,
        jobId: queuedId || composeJobId,
        status: 'queued'
      }
    })

  } catch (error) {
    console.error('[Video Agent] ❌❌❌ Compose video error:', {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start video composition',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        code: 'COMPOSE_FAILED'
      },
      { status: 500 }
    )
  }
})
