/**
 * Video Agent - 单个视频重新生成 API
 * POST: 重新生成指定的视频片段
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import {
  generateVeo3Video,
  getVideoGenerationImages
} from '@/lib/services/video-agent/veo3-video-generator'

/**
 * 重新生成单个视频片段
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
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log('[Video Agent] 🔄 Retrying video generation', {
      projectId,
      shotNumber,
      enableNarration: project.enable_narration
    })

    // 获取对应的 shot 和 storyboard 数据
    const { data: shot } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single()

    if (!shot) {
      return NextResponse.json(
        { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    const { data: storyboard } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single()

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found', code: 'STORYBOARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 更新状态为 generating
    await supabaseAdmin
      .from('project_video_clips')
      .update({
        status: 'generating',
        error_message: null,
        updated_at: new Date().toISOString()
      })
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)

    // 根据是否启用旁白选择不同的生成方式
    if (project.enable_narration) {
      // 🎙️ Veo3.1 旁白模式：独立生成
      console.log(`[Video Agent] 🔄 Using Veo3.1 (narration mode) for shot ${shotNumber}`)

      // 获取下一个分镜图（用于流畅过渡）
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
        throw new Error('No reference image available for Veo3.1 generation')
      }

      // 🔥 增强 prompt：结合场景描述 + 角色动作
      const enhancedPrompt = `${shot.description}. ${shot.character_action}`

      const { requestId } = await generateVeo3Video({
        prompt: enhancedPrompt,
        image: images.image,
        aspectRatio: project.aspect_ratio || '16:9',
        duration: shot.duration_seconds,
        lastImage: images.lastImage
      })

      console.log(`[Video Agent] 🔄 Enhanced prompt for shot ${shotNumber}:`, enhancedPrompt)

      await supabaseAdmin
        .from('project_video_clips')
        .update({
          video_request_id: requestId,
          video_status: 'generating',
          status: 'generating',
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      console.log(`[Video Agent] 🔄 Veo3.1 task ${requestId} submitted for shot ${shotNumber}`)

    } else {
      // 🎬 BytePlus Seedance: 使用分镜图生成
      // 🔥 重新生成时使用新的随机 seed，确保生成不同的视频
      const newSeed = Math.floor(Math.random() * 1000000)

      // 🔥 增强 prompt：结合场景描述 + 角色动作
      const enhancedPrompt = `${shot.description}. ${shot.character_action}`

      const videoRequest: VideoGenerationRequest = {
        image: storyboard.image_url,
        prompt: enhancedPrompt,
        model: 'vidfab-q1',
        duration: shot.duration_seconds,
        resolution: '1080p',
        aspectRatio: project.aspect_ratio || '16:9',
        cameraFixed: true,
        watermark: false,
        seed: newSeed  // 🔥 使用新的随机 seed
      }

      console.log(`[Video Agent] 🔄 Enhanced prompt for shot ${shotNumber}:`, enhancedPrompt)
      console.log(`[Video Agent] 🔄 Using new random seed: ${newSeed} (old: ${shot.seed})`)

      const result = await submitVideoGeneration(videoRequest, {
        returnLastFrame: true
      })

      await supabaseAdmin
        .from('project_video_clips')
        .update({
          seedance_task_id: result.data.id,
          status: 'generating',
          error_message: null,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)

      console.log(`[Video Agent] 🔄 BytePlus task ${result.data.id} submitted for shot ${shotNumber}`)
    }

    return NextResponse.json({
      success: true,
      data: {
        shotNumber,
        status: 'generating',
        message: 'Video regeneration started'
      }
    })

  } catch (error) {
    console.error('[Video Agent] Retry video generation error:', error)

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
