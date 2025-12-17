/**
 * Video Agent - 重试视频生成 API
 * POST: 重试失败的视频片段生成
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { retryVideoGeneration } from '@/lib/services/video-agent/video-generator'
import type { Shot, Storyboard } from '@/lib/services/video-agent/video-generator'

/**
 * 重试视频生成
 * POST /api/video-agent/projects/[id]/videos/[shotNumber]/retry
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; shotNumber: string } }
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
    const shotNumber = parseInt(params.shotNumber, 10)

    if (isNaN(shotNumber)) {
      return NextResponse.json(
        { error: 'Invalid shot number', code: 'INVALID_SHOT_NUMBER' },
        { status: 400 }
      )
    }

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id, regenerate_quota_remaining, enable_narration, aspect_ratio')
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

    // 检查重试配额
    if (project.regenerate_quota_remaining <= 0) {
      return NextResponse.json(
        { error: 'Regenerate quota exhausted', code: 'QUOTA_EXHAUSTED' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Retrying video generation', {
      projectId,
      shotNumber,
      remainingQuota: project.regenerate_quota_remaining
    })

    // 获取分镜脚本
    const { data: shot, error: shotError } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single()

    if (shotError || !shot) {
      return NextResponse.json(
        { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取分镜图
    const { data: storyboard, error: storyboardError } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single()

    if (storyboardError || !storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found', code: 'STORYBOARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (storyboard.status !== 'success') {
      return NextResponse.json(
        { error: 'Storyboard is not ready', code: 'STORYBOARD_NOT_READY' },
        { status: 400 }
      )
    }

    // 获取当前视频片段记录
    const { data: existingClip, error: clipError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single()

    if (clipError || !existingClip) {
      return NextResponse.json(
        { error: 'Video clip record not found', code: 'CLIP_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 判断是否使用 veo3.1 生成带旁白的视频
    let taskId: string
    const enableNarration = project.enable_narration || false
    const aspectRatio = project.aspect_ratio || '16:9'

    console.log('[Video Agent] Retry with settings', {
      projectId,
      shotNumber,
      enableNarration,
      aspectRatio
    })

    if (enableNarration) {
      // 使用 Veo3.1 重试
      const { generateVeo3Video, getVideoGenerationImages } = await import('@/lib/services/video-agent/veo3-video-generator')

      // 获取下一个分镜图（用于过渡）
      const { data: nextStoryboard } = await supabaseAdmin
        .from('project_storyboards')
        .select('*')
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber + 1)
        .single()

      const images = getVideoGenerationImages(
        { imageUrl: storyboard.image_url },
        nextStoryboard ? { imageUrl: nextStoryboard.image_url } : undefined
      )

      if (!images) {
        return NextResponse.json(
          { error: 'No reference image available for Veo3.1 generation' },
          { status: 400 }
        )
      }

      const { requestId } = await generateVeo3Video({
        prompt: shot.character_action,
        image: images.image,
        aspectRatio: aspectRatio as '16:9' | '9:16',
        duration: shot.duration_seconds,
        lastImage: images.lastImage
      })

      taskId = requestId

      // 更新数据库
      await supabaseAdmin
        .from('project_video_clips')
        .update({
          video_request_id: requestId,
          status: 'generating',
          error_message: null,
          retry_count: (existingClip.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClip.id)

      console.log('[Video Agent] Veo3.1 retry submitted', {
        projectId,
        shotNumber,
        requestId
      })

      return NextResponse.json({
        success: true,
        data: {
          shotNumber,
          taskId: requestId,
          status: 'generating',
          remainingQuota: project.regenerate_quota_remaining - 1
        }
      })
    } else {
      // 使用 BytePlus seedance 重试
      const result = await retryVideoGeneration(
        storyboard as Storyboard,
        shot as Shot,
        {
          userId: session.user.uuid,
          watermark: false,
          resolution: '1080p',
          model: 'vidfab-q1',
          aspectRatio: aspectRatio as '16:9' | '9:16'
        }
      )

      taskId = result.task_id || ''

      console.log('[Video Agent] BytePlus seedance retry submitted', {
        projectId,
        shotNumber,
        taskId: result.task_id,
        status: result.status
      })

      // 更新数据库中的视频片段记录
      const { error: updateError } = await supabaseAdmin
        .from('project_video_clips')
        .update({
          seedance_task_id: result.task_id || null,
          status: result.status,
          error_message: result.error || null,
          retry_count: (existingClip.retry_count || 0) + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingClip.id)

      if (updateError) {
        console.error('[Video Agent] Failed to update video clip:', updateError)
      }

      // 扣除重试配额
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          regenerate_quota_remaining: project.regenerate_quota_remaining - 1
        })
        .eq('id', projectId)

      return NextResponse.json({
        success: true,
        data: {
          shotNumber,
          taskId: result.task_id,
          status: result.status,
          retryCount: (existingClip.retry_count || 0) + 1,
          remainingQuota: project.regenerate_quota_remaining - 1
        }
      })
    }

  } catch (error) {
    console.error('[Video Agent] Video retry error:', error)
    return NextResponse.json(
      {
        error: 'Failed to retry video generation',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
