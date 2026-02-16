/**
 * Video Agent - 批量视频生成 API
 * POST: 批量生成视频片段 (步骤 5)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Shot, Storyboard } from '@/lib/types/video-agent'
import {
  generateVeo3Video,
  getVideoGenerationImages
} from '@/lib/services/video-agent/veo3-video-generator'
import type { Database } from '@/lib/database.types'
import pLimit from 'p-limit'
import { checkAndDeductBatchVideos } from '@/lib/video-agent/credits-check'
import { isVeo3Model, getDefaultResolution } from '@/lib/video-agent/credits-config'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

/**
 * ✅ 优化: 移除了阻塞轮询函数
 * 现在只提交任务，不等待完成
 * 由前端轮询 /videos/status API 来获取实时状态
 */

/**
 * ✅ 优化后的视频生成函数
 *
 * 关键改进：
 * 1. 旁白模式：并发生成（3个并发），速度提升 6 倍
 * 2. 非旁白模式：保持顺序（首尾帧链式），但移除阻塞轮询
 * 3. 只提交任务，不等待完成，由前端轮询状态 API
 */
async function generateVideosAsync(
  projectId: string,
  storyboards: Storyboard[],
  shots: Shot[],
  userId: string,
  enableNarration: boolean = false,
  aspectRatio: '16:9' | '9:16' = '16:9'
) {
  if (enableNarration) {
    // ✅ 旁白模式（Veo3.1）：并发生成
    // 每个视频独立生成，不需要首尾帧链式，可以并发
    await generateVeo3VideosInParallel(projectId, storyboards, shots, aspectRatio)
  } else {
    // ✅ 非旁白模式（BytePlus）：顺序生成（首尾帧链式）
    // 需要上一个视频的末尾帧，必须顺序，但不阻塞轮询
    await generateBytePlusVideosSequentially(projectId, storyboards, shots, aspectRatio)
  }
}

/**
 * ✅ Veo3.1 旁白模式：并发生成
 * 并发数限制为 3，避免触发速率限制
 */
async function generateVeo3VideosInParallel(
  projectId: string,
  storyboards: Storyboard[],
  shots: Shot[],
  aspectRatio: '16:9' | '9:16'
) {
  const limit = pLimit(3)  // 并发数限制为 3

  const tasks = storyboards.map((storyboard, index) =>
    limit(async () => {
      const shot = shots.find(s => s.shot_number === storyboard.shot_number)

      if (!shot) {
        await supabaseAdmin
          .from('project_video_clips')
          .update({
            status: 'failed',
            error_message: 'Shot not found in script analysis',
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', storyboard.shot_number)
          .returns<any>()
        return
      }

      try {
        // 获取下一个分镜图（用于流畅过渡）
        const nextStoryboard = storyboards.find(sb => sb.shot_number === shot.shot_number + 1)

        const images = getVideoGenerationImages(
          { imageUrl: storyboard.image_url },
          nextStoryboard ? { imageUrl: nextStoryboard.image_url } : undefined
        )

        if (!images) {
          throw new Error('No reference image available for Veo3.1 generation')
        }

        // 增强 prompt：场景描述（已包含角色动作）+ 禁止字幕
        const enhancedPrompt = `${shot.description}. No text, no subtitles, no captions, no words on screen.`

        const { requestId } = await generateVeo3Video({
          prompt: enhancedPrompt,
          image: images.image,
          aspectRatio: aspectRatio,
          duration: shot.duration_seconds,
          lastImage: images.lastImage
        })

        // ✅ 只保存 request_id，不等待完成
        await supabaseAdmin
          .from('project_video_clips')
          .update({
            video_request_id: requestId,
            video_status: 'generating',
            status: 'generating',
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
          .returns<any>()
      } catch (error) {
        console.error(`[Video Agent] ❌ Failed to submit Veo3 task for shot ${shot.shot_number}:`, error)

        await supabaseAdmin
          .from('project_video_clips')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Failed to submit video generation task',
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
          .returns<any>()
      }
    })
  )

  // 等待所有任务提交完成（不等待视频生成完成）
  await Promise.allSettled(tasks)
}

/**
 * ✅ BytePlus 非旁白模式：顺序生成（首尾帧链式）
 * 需要上一个视频的末尾帧，必须顺序执行
 * 但不阻塞轮询，由 /videos/status API 负责查询完成状态和获取 last_frame_url
 */
async function generateBytePlusVideosSequentially(
  projectId: string,
  storyboards: Storyboard[],
  shots: Shot[],
  aspectRatio: '16:9' | '9:16'
) {
  // ⚠️ 注意：这里只提交第一个视频
  // 后续视频需要等第一个完成后，由 /videos/status API 或单独的后台任务触发
  // 为了简化，我们仍然顺序提交所有任务，但使用分镜图作为首帧（不等待 last_frame）

  for (let i = 0; i < storyboards.length; i++) {
    const storyboard = storyboards[i]
    const shot = shots.find(s => s.shot_number === storyboard.shot_number)

    if (!shot) {
      await supabaseAdmin
        .from('project_video_clips')
        .update({
          status: 'failed',
          error_message: 'Shot not found in script analysis',
          updated_at: new Date().toISOString()
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', storyboard.shot_number)
        .returns<any>()
      continue
    }

    try {
      // ✅ 简化：都使用分镜图作为首帧
      // 如果需要首尾帧链式，需要更复杂的任务队列逻辑
      const firstFrameUrl = storyboard.image_url

      // 增强 prompt（description 已包含角色动作）
      const enhancedPrompt = `Maintain exact character appearance and features from the reference image. ${shot.description}. Keep all character visual details consistent with the reference. No text, no subtitles, no captions, no words on screen.`

      // 🔥 Seedance 时长限制：2-12 秒（官方文档）
      // 参考：https://docs.byteplus.com/en/docs/ModelArk/1587798
      const minDuration = 2
      const maxDuration = 12
      let clampedDuration = shot.duration_seconds

      if (clampedDuration < minDuration) {
        console.warn(`[Video Agent] Shot ${shot.shot_number} duration too short: ${shot.duration_seconds}s → ${minDuration}s (Seedance min: ${minDuration}s)`)
        clampedDuration = minDuration
      } else if (clampedDuration > maxDuration) {
        console.warn(`[Video Agent] Shot ${shot.shot_number} duration too long: ${shot.duration_seconds}s → ${maxDuration}s (Seedance max: ${maxDuration}s)`)
        clampedDuration = maxDuration
      }

      const videoRequest: VideoGenerationRequest = {
        image: firstFrameUrl,
        prompt: enhancedPrompt,
        model: 'vidfab-q1',
        duration: clampedDuration,  // 🔥 使用截断后的时长
        resolution: '720p',
        aspectRatio: aspectRatio,
        cameraFixed: true,
        watermark: false,
        seed: shot.seed
      }

      // 提交任务
      const result = await submitVideoGeneration(videoRequest, {
        returnLastFrame: true
      })

      // ✅ 保存 task_id
      await supabaseAdmin
        .from('project_video_clips')
        .update({
          seedance_task_id: result.data.id,
          status: 'generating',
          updated_at: new Date().toISOString()
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shot.shot_number)
        .returns<any>()
    } catch (error: any) {
      console.error(`[Video Agent] Failed to submit BytePlus task for shot ${shot.shot_number}:`, error?.code || error?.message)

      // 🔥 检查是否为敏感内容错误
      let errorMessage = error instanceof Error ? error.message : 'Failed to submit video generation task'

      if (error?.code === 'InputTextSensitiveContentDetected') {
        errorMessage = `Sensitive content detected in prompt for shot ${shot.shot_number}. Please modify the description or character action. Prompt: "${enhancedPrompt.substring(0, 150)}..."`
        console.error(`[Video Agent] Sensitive content detected for shot ${shot.shot_number}`)
      }

      const { error: updateError } = await supabaseAdmin
        .from('project_video_clips')
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shot.shot_number)

      if (updateError) {
        console.error(`[Video Agent] Failed to update shot ${shot.shot_number} status:`, updateError)
      }

      // 非旁白模式：一个失败后，后续都标记为失败
      const remainingCount = storyboards.length - i - 1
      if (remainingCount > 0) {
        console.warn(`[Video Agent] ⚠️ 链式生成中断，剩余 ${remainingCount} 个片段将标记为失败`)

        for (let j = i + 1; j < storyboards.length; j++) {
          await supabaseAdmin
            .from('project_video_clips')
            .update({
              status: 'failed',
              error_message: 'Previous shot generation failed, chain interrupted',
              updated_at: new Date().toISOString()
            } as any)
            .eq('project_id', projectId)
            .eq('shot_number', storyboards[j].shot_number)
            .returns<any>()
        }
      }

      break  // 终止循环
    }
  }
}

/**
 * 批量生成视频片段
 * POST /api/video-agent/projects/[id]/videos/generate
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
      console.error('[Video Agent] Project not found:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 🔥 检查是否有足够的分镜图（移除 step_3_status 检查，支持 Step 1 集成）
    const { data: existingStoryboards, error: sbCheckError } = await supabaseAdmin
      .from('project_storyboards')
      .select('shot_number, status')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .eq('status', 'success')

    if (sbCheckError) {
      console.error('[Video Agent] Error checking storyboards:', sbCheckError)
      return NextResponse.json(
        { error: 'Failed to check storyboard status', code: 'STORYBOARD_CHECK_ERROR' },
        { status: 500 }
      )
    }

    if (!existingStoryboards || existingStoryboards.length === 0) {
      console.error('[Video Agent] ❌ No successful storyboards found:', {
        projectId,
        storyboardCount: existingStoryboards?.length || 0
      })
      return NextResponse.json(
        {
          error: 'Storyboards must be generated first',
          code: 'STORYBOARDS_NOT_READY',
          details: {
            storyboardCount: existingStoryboards?.length || 0
          }
        },
        { status: 400 }
      )
    }

    console.log('[Video Agent] ✅ Found storyboards:', {
      projectId,
      successfulStoryboards: existingStoryboards.length
    })

    // 获取分镜脚本
    // 🔥 使用 let 而不是 const，因为恢复机制可能需要重新赋值
    let { data: shots, error: shotsError } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    if (shotsError || !shots || shots.length === 0) {
      console.error('[Video Agent] ❌ No shots found in project_shots table:', {
        projectId,
        shotsError: shotsError?.message,
        shotsCount: shots?.length || 0,
        hasScriptAnalysis: !!project.script_analysis,
        shotCountInAnalysis: project.script_analysis?.shots?.length
      })

      // 🔥 后备方案：如果 project_shots 表为空，但 script_analysis 有数据，直接从中提取并保存
      if (project.script_analysis && typeof project.script_analysis === 'object') {
        const analysis = project.script_analysis as any

        if (analysis.shots && Array.isArray(analysis.shots) && analysis.shots.length > 0) {
          try {
            const shotsToInsert = analysis.shots.map((shot: any) => ({
              project_id: projectId,
              shot_number: shot.shot_number,
              time_range: shot.time_range,
              description: shot.description,
              camera_angle: shot.camera_angle,
              mood: shot.mood,
              duration_seconds: Math.max(2, Math.round(shot.duration_seconds))  // 🔥 最小2秒
            }))

            const { error: insertError } = await supabaseAdmin
              .from('project_shots')
              .upsert(shotsToInsert as any, {
                onConflict: 'project_id,shot_number'
              })

            if (insertError) {
              console.error('[Video Agent] Failed to insert shots from script_analysis:', insertError)
            } else {
              // 重新查询 shots
              const { data: recoveredShots } = await supabaseAdmin
                .from('project_shots')
                .select('*')
                .eq('project_id', projectId)
                .order('shot_number', { ascending: true })

              if (recoveredShots && recoveredShots.length > 0) {
                shots = recoveredShots
              }
            }
          } catch (recoveryError) {
            console.error('[Video Agent] Shots recovery failed:', recoveryError)
          }
        }
      }

      // 如果恢复后仍然没有 shots，返回错误
      if (!shots || shots.length === 0) {
        return NextResponse.json(
          {
            error: 'No shots found for this project',
            code: 'NO_SHOTS',
            details: {
              shotsError: shotsError?.message,
              hasScriptAnalysis: !!project.script_analysis
            }
          },
          { status: 400 }
        )
      }
    }

    // 获取分镜图（只查询当前版本）
    const { data: storyboards, error: storyboardsError } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .eq('is_current', true)
      .eq('status', 'success')  // 只处理成功生成的分镜图
      .order('shot_number', { ascending: true })

    if (storyboardsError || !storyboards || storyboards.length === 0) {
      console.error('[Video Agent] ❌ No successful storyboards found:', {
        projectId,
        storyboardsError: storyboardsError?.message,
        storyboardsCount: storyboards?.length || 0,
        step_3_status: project.step_3_status
      })
      return NextResponse.json(
        {
          error: 'No successful storyboards found',
          code: 'NO_STORYBOARDS',
          details: {
            storyboardsError: storyboardsError?.message,
            storyboardsCount: storyboards?.length || 0,
            step_3_status: project.step_3_status
          }
        },
        { status: 400 }
      )
    }

    // ✅ 积分检查: 计算所有分镜的总积分
    // 从数据库读取每个分镜的 duration 和 resolution
    const modelId = project.model_id || 'vidfab-q1'  // 默认 BytePlus 模型
    const useVeo3 = isVeo3Model(modelId)
    const defaultResolution = getDefaultResolution(modelId)

    const shotsForCredits = shots.map(shot => ({
      duration_seconds: shot.duration_seconds || 5,
      resolution: (shot as any).resolution || defaultResolution  // 🔥 从数据库读取用户选择的分辨率
    }))

    console.log('[Video Agent] Credits calculation for batch:', {
      projectId,
      shotsCount: shots.length,
      shotsForCredits,
      useVeo3
    })

    const creditResult = await checkAndDeductBatchVideos(userId, shotsForCredits, useVeo3)

    if (!creditResult.canAfford) {
      return NextResponse.json(
        {
          error: creditResult.error || 'Insufficient credits',
          code: 'INSUFFICIENT_CREDITS',
          requiredCredits: creditResult.requiredCredits,
          userCredits: creditResult.userCredits
        },
        { status: 402 }
      )
    }

    console.log('[Video Agent] ✅ Credits checked and deducted:', {
      projectId,
      model: modelId,
      resolution,
      shotsCount: shots.length,
      creditsDeducted: creditResult.requiredCredits,
      remainingCredits: creditResult.remainingCredits
    })

    // 🔥 幂等性检查：检查是否已经有视频生成记录
    const { data: existingClips } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)

    const hasExistingClips = existingClips && existingClips.length > 0

    if (hasExistingClips) {
      // 检查是否有已完成的视频
      const hasCompleted = existingClips.some(clip => clip.status === 'success')

      if (hasCompleted) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'Video generation already completed',
            totalClips: existingClips.length,
            alreadyStarted: true
          }
        })
      }

      // 检查是否有正在生成的视频（需要验证任务是否真的在运行）
      const generatingClips = existingClips.filter(clip => clip.status === 'generating')

      if (generatingClips.length > 0) {
        // 🔥 改进：检查是否真的有任务在运行
        const hasRealTasks = generatingClips.some(clip =>
          clip.seedance_task_id || clip.video_request_id
        )

        // 🔥 检查是否卡住（超过 10 分钟）
        const now = new Date()
        const TIMEOUT_MS = 10 * 60 * 1000  // 10 分钟
        const hasStuckTasks = generatingClips.some(clip => {
          const updatedAt = new Date(clip.updated_at)
          return (now.getTime() - updatedAt.getTime()) > TIMEOUT_MS
        })

        if (hasRealTasks && !hasStuckTasks) {
          // 有真实任务在运行，且未超时
          return NextResponse.json({
            success: true,
            data: {
              message: 'Video generation already in progress',
              totalClips: existingClips.length,
              alreadyStarted: true
            }
          })
        } else {
          // 任务提交失败或卡住，重置这些记录
          console.warn('[Video Agent] ⚠️ Resetting stuck/failed video generation tasks', {
            projectId,
            stuckCount: generatingClips.length,
            hasRealTasks,
            hasStuckTasks
          })

          await supabaseAdmin
            .from('project_video_clips')
            .update({
              status: 'idle',
              error_message: 'Previous generation attempt failed or timed out',
              updated_at: new Date().toISOString()
            } as any)
            .eq('project_id', projectId)
            .eq('status', 'generating')
            .returns<any>()
        }
      }
    }

    // 更新项目状态为 processing
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'processing',
        step_4_status: 'processing'
        // 不更新 current_step，由前端在用户点击"继续"时更新
      } as any)
      .eq('id', projectId)
      .returns<any>()

    // 立即在数据库中创建所有视频记录，状态为 'generating'
    const initialClips = storyboards.map(sb => ({
      project_id: projectId,
      shot_number: sb.shot_number,
      status: 'generating',
      retry_count: 0
    }))

    const { error: insertError } = await supabaseAdmin
      .from('project_video_clips')
      .upsert(initialClips as any, {
        onConflict: 'project_id,shot_number'
      })

    if (insertError) {
      console.error('[Video Agent] Failed to initialize video clips:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize video clips' },
        { status: 500 }
      )
    }

    // 立即返回，后台异步生成
    Promise.resolve().then(async () => {
      await generateVideosAsync(
        projectId,
        storyboards as Storyboard[],
        shots as Shot[],
        userId,
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
        } as any)
        .eq('id', params.id)
        .returns<any>()
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
})
