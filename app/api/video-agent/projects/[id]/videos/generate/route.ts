/**
 * Video Agent - 批量视频生成 API
 * POST: 批量生成视频片段 (步骤 5)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitVideoGeneration, checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Shot, Storyboard } from '@/lib/services/video-agent/video-generator'
import {
  generateVeo3Video,
  getVideoGenerationImages
} from '@/lib/services/video-agent/veo3-video-generator'

/**
 * 辅助函数：延迟
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 轮询单个视频生成状态
 */
async function pollVideoStatus(
  taskId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<{
  video_url: string
  lastFrameUrl?: string
  status: 'completed' | 'failed'
  error?: string
}> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const status = await checkVideoStatus(taskId)

      if (status.data.status === 'completed') {
        if (!status.data.outputs || status.data.outputs.length === 0) {
          throw new Error('视频生成完成但未返回视频 URL')
        }
        return {
          video_url: status.data.outputs[0],
          lastFrameUrl: status.data.lastFrameUrl,
          status: 'completed'
        }
      }

      if (status.data.status === 'failed') {
        return {
          video_url: '',
          status: 'failed',
          error: status.data.error || '视频生成失败'
        }
      }

      await sleep(intervalMs)
    } catch (error: any) {
      if (i === maxAttempts - 1) {
        return {
          video_url: '',
          status: 'failed',
          error: error.message || '视频状态查询失败'
        }
      }
      await sleep(intervalMs)
    }
  }

  return {
    video_url: '',
    status: 'failed',
    error: '视频生成超时(5分钟)'
  }
}

/**
 * 🔥 异步链式生成视频（后台任务）
 * 使用首尾帧过渡，顺序生成所有视频片段
 */
async function generateVideosAsync(
  projectId: string,
  storyboards: Storyboard[],
  shots: Shot[],
  userId: string,
  enableNarration: boolean = false,
  aspectRatio: '16:9' | '9:16' = '16:9'
) {
  console.log('[Video Agent] 🔥 Starting sequential video generation with transition', {
    projectId,
    clipsCount: storyboards.length,
    enableNarration,
    aspectRatio,
    mode: 'sequential_with_last_frame'
  })

  let previousLastFrameUrl: string | undefined = undefined

  // 🔥 关键：顺序生成（而非并行）
  for (let i = 0; i < storyboards.length; i++) {
    const storyboard = storyboards[i]
    const shot = shots.find(s => s.shot_number === storyboard.shot_number)

    if (!shot) {
      await supabaseAdmin
        .from('project_video_clips')
        .update({
          status: 'failed',
          error_message: '未找到对应的分镜脚本',
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', storyboard.shot_number)
      continue
    }

    try {
      // 🔥 旁白模式 (Veo3.1)：每个片段使用自己的分镜图
      // 🔥 非旁白模式 (BytePlus)：第一个用分镜图，后续用上一个片段的末尾帧
      const firstFrameUrl = enableNarration
        ? storyboard.image_url  // 旁白模式：始终使用分镜图
        : (i === 0 ? storyboard.image_url : previousLastFrameUrl)  // 非旁白：链式过渡

      if (!firstFrameUrl) {
        throw new Error(`片段 ${shot.shot_number} 缺少首帧图像（上一个片段可能未返回末尾帧）`)
      }

      const frameSource = enableNarration
        ? 'storyboard (narration mode)'
        : (i === 0 ? 'storyboard' : 'previous_last_frame')

      console.log(`[Video Agent] 生成片段 ${i + 1}/${storyboards.length}`, {
        shot_number: shot.shot_number,
        firstFrameSource: frameSource,
        enableNarration,
        mode: enableNarration ? 'veo3.1' : 'byteplus'
      })

      // 判断是否使用 veo3.1 生成带旁白的视频
      if (enableNarration) {
        // 🔥 Veo3.1 旁白模式：不使用首帧链式过渡，每个视频独立生成
        // 使用分镜图作为起始帧，下一个分镜图作为结束帧（实现流畅过渡）
        console.log(`[Video Agent] Using Veo3.1 (narration mode) for shot ${shot.shot_number}`)

        const nextStoryboard = storyboards.find(sb => sb.shot_number === shot.shot_number + 1)
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
          aspectRatio: aspectRatio,
          duration: shot.duration_seconds,
          lastImage: images.lastImage
        })

        console.log(`[Video Agent] 🎬 Enhanced prompt for shot ${shot.shot_number}:`, enhancedPrompt)

        await supabaseAdmin
          .from('project_video_clips')
          .update({
            video_request_id: requestId,
            video_status: 'generating',
            status: 'generating',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        console.log(`[Video Agent] Veo3.1 task ${requestId} submitted for shot ${shot.shot_number}`)

        // ✅ 不需要 previousLastFrameUrl，每个视频独立生成

      } else {
        // 🔥 BytePlus Seedance: 使用链式首帧
        // 🔥 增强 prompt：结合场景描述 + 角色动作
        const enhancedPrompt = `${shot.description}. ${shot.character_action}`

        const videoRequest: VideoGenerationRequest = {
          image: firstFrameUrl,  // 🔥 使用链式首帧
          prompt: enhancedPrompt,
          model: 'vidfab-q1',
          duration: shot.duration_seconds,
          resolution: '1080p',
          aspectRatio: aspectRatio,
          cameraFixed: true,
          watermark: false,
          seed: shot.seed
        }

        console.log(`[Video Agent] 🎬 Enhanced prompt for shot ${shot.shot_number}:`, enhancedPrompt)

        // 提交任务（return_last_frame 默认启用）
        const result = await submitVideoGeneration(videoRequest, {
          returnLastFrame: true
        })

        await supabaseAdmin
          .from('project_video_clips')
          .update({
            seedance_task_id: result.data.id,
            status: 'generating',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        console.log(`[Video Agent] 片段 ${shot.shot_number} 任务已提交，等待完成...`)

        // 🔥 轮询等待完成（获取 last_frame_url）
        const pollResult = await pollVideoStatus(result.data.id)

        if (pollResult.status === 'failed') {
          throw new Error(pollResult.error || '视频生成失败')
        }

        // 🔥 保存末尾帧 URL，供下一个片段使用
        previousLastFrameUrl = pollResult.lastFrameUrl

        // 更新数据库
        await supabaseAdmin
          .from('project_video_clips')
          .update({
            video_url: pollResult.video_url,
            last_frame_url: pollResult.lastFrameUrl,  // 🔥 保存末尾帧
            status: 'completed',
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)

        console.log(`[Video Agent] 片段 ${shot.shot_number} 完成 ✓`, {
          hasLastFrame: !!pollResult.lastFrameUrl
        })
      }

    } catch (error) {
      console.error(`[Video Agent] 片段 ${shot.shot_number} 生成失败:`, error)

      await supabaseAdmin
        .from('project_video_clips')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : '视频生成失败',
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', shot.shot_number)

      // 🔥 非旁白模式：链式生成，一个失败终止后续
      // 🔥 旁白模式：独立生成，一个失败不影响后续
      if (!enableNarration) {
        const remainingCount = storyboards.length - i - 1
        if (remainingCount > 0) {
          console.warn(`[Video Agent] ⚠️ 链式生成中断，剩余 ${remainingCount} 个片段将标记为失败`)

          for (let j = i + 1; j < storyboards.length; j++) {
            await supabaseAdmin
              .from('project_video_clips')
              .update({
                status: 'failed',
                error_message: '前序片段生成失败，链条中断',
                updated_at: new Date().toISOString()
              })
              .eq('project_id', projectId)
              .eq('shot_number', storyboards[j].shot_number)
          }
        }

        break  // 终止循环（仅非旁白模式）
      } else {
        console.log(`[Video Agent] ℹ️ 旁白模式：片段 ${shot.shot_number} 失败，继续生成后续片段`)
        // 旁白模式：继续下一个片段
      }
    }
  }

  console.log('[Video Agent] 链式视频生成完成', { projectId })
}

/**
 * 批量生成视频片段
 * POST /api/video-agent/projects/[id]/videos/generate
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
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查是否已完成分镜图生成
    if (!project.step_3_status || project.step_3_status !== 'completed') {
      return NextResponse.json(
        { error: 'Storyboards must be generated first', code: 'STORYBOARDS_NOT_READY' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Starting batch video generation', {
      projectId,
      currentStep: project.current_step
    })

    // 获取分镜脚本
    const { data: shots, error: shotsError } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    if (shotsError || !shots || shots.length === 0) {
      return NextResponse.json(
        { error: 'No shots found for this project', code: 'NO_SHOTS' },
        { status: 400 }
      )
    }

    // 获取分镜图
    const { data: storyboards, error: storyboardsError } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'success')  // 只处理成功生成的分镜图
      .order('shot_number', { ascending: true })

    if (storyboardsError || !storyboards || storyboards.length === 0) {
      return NextResponse.json(
        { error: 'No successful storyboards found', code: 'NO_STORYBOARDS' },
        { status: 400 }
      )
    }

    // 🔥 幂等性检查：检查是否已经有视频生成记录
    const { data: existingClips } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)

    const hasExistingClips = existingClips && existingClips.length > 0

    if (hasExistingClips) {
      // 已经有记录，检查是否有正在生成或已完成的视频
      const hasGenerating = existingClips.some(clip => clip.status === 'generating')
      const hasCompleted = existingClips.some(clip => clip.status === 'success')

      if (hasGenerating || hasCompleted) {
        console.log('[Video Agent] Video generation already in progress or completed', {
          projectId,
          hasGenerating,
          hasCompleted,
          existingClipsCount: existingClips.length
        })

        return NextResponse.json({
          success: true,
          data: {
            message: 'Video generation already started',
            totalClips: existingClips.length,
            alreadyStarted: true
          }
        })
      }
    }

    // 更新项目状态为 processing
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'processing',
        step_4_status: 'processing'
        // 不更新 current_step，由前端在用户点击"继续"时更新
      })
      .eq('id', projectId)

    // 立即在数据库中创建所有视频记录，状态为 'generating'
    const initialClips = storyboards.map(sb => ({
      project_id: projectId,
      shot_number: sb.shot_number,
      status: 'generating',
      retry_count: 0
    }))

    const { error: insertError } = await supabaseAdmin
      .from('project_video_clips')
      .upsert(initialClips, {
        onConflict: 'project_id,shot_number'
      })

    if (insertError) {
      console.error('[Video Agent] Failed to initialize video clips:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize video clips' },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Video generation started (async)', {
      projectId,
      clipsCount: storyboards.length,
      enableNarration: project.enable_narration,
      aspectRatio: project.aspect_ratio
    })

    // 立即返回，后台异步生成
    Promise.resolve().then(async () => {
      await generateVideosAsync(
        projectId,
        storyboards as Storyboard[],
        shots as Shot[],
        session.user.uuid,
        project.enable_narration || false,
        project.aspect_ratio || '16:9'
      )
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Video generation started',
        totalClips: storyboards.length
      }
    })

  } catch (error) {
    console.error('[Video Agent] Video generation error:', error)

    // 更新项目状态为失败
    try {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          status: 'failed',
          step_4_status: 'failed'
        })
        .eq('id', params.id)
    } catch (updateError) {
      console.error('[Video Agent] Failed to update project status:', updateError)
    }

    return NextResponse.json(
      {
        error: 'Video generation failed',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
