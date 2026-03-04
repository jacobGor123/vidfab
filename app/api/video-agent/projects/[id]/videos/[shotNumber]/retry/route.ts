/**
 * Video Agent - 单个视频重新生成 API
 * POST: 重新生成指定的视频片段
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import type { Database } from '@/lib/database.types'
import { checkAndDeductSingleVideo } from '@/lib/video-agent/credits-check'
import { refundUserCredits } from '@/lib/simple-credits-check'
import { isVeo3Model, getDefaultResolution, type VideoResolution } from '@/lib/video-agent/credits-config'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']
type ProjectStoryboard = Database['public']['Tables']['project_storyboards']['Row']

/**
 * 重新生成单个视频片段
 * POST /api/video-agent/projects/[id]/videos/[shotNumber]/retry
 */
export const POST = withAuth(async (request, { params, userId }) => {
  let deductedCredits = 0  // 追踪已扣积分，用于错误时退款

  try {
    const projectId = params.id
    const shotNumber = parseInt(params.shotNumber, 10)

    if (isNaN(shotNumber)) {
      return NextResponse.json(
        { error: 'Invalid shot number', code: 'INVALID_SHOT_NUMBER' },
        { status: 400 }
      )
    }

    // 🔥 获取用户自定义 prompt（如果有）
    const body = await request.json().catch(() => ({}))
    const customPrompt = body.customPrompt as string | undefined

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    console.log('[Video Agent] 🔄 Retrying video generation', { projectId, shotNumber })

    // 获取对应的 shot，若缺失则尝试从 script_analysis 恢复
    let { data: shot } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .single<ProjectShot>()

    if (!shot) {
      const analysis = project.script_analysis as any
      const analysisShot = analysis?.shots?.find((s: any) => s.shot_number === shotNumber)

      if (analysisShot) {
        console.warn('[Video Agent] ⚠️ Shot missing, recovering from script_analysis', { projectId, shotNumber })
        await supabaseAdmin
          .from('project_shots')
          .upsert({
            project_id: projectId,
            shot_number: analysisShot.shot_number,
            time_range: analysisShot.time_range,
            description: analysisShot.description,
            camera_angle: analysisShot.camera_angle,
            character_action: analysisShot.character_action,
            mood: analysisShot.mood,
            duration_seconds: Math.max(4, Math.round(analysisShot.duration_seconds)),
            resolution: analysisShot.resolution || getDefaultResolution(project.model_id || 'vidfab-q1')
          } as any, { onConflict: 'project_id,shot_number' })

        const { data: recoveredShot } = await supabaseAdmin
          .from('project_shots')
          .select('*')
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)
          .single<ProjectShot>()

        shot = recoveredShot
      }

      if (!shot) {
        console.error('[Video Agent] ❌ Shot not found in project_shots or script_analysis', { projectId, shotNumber })
        return NextResponse.json(
          { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
          { status: 404 }
        )
      }
    }

    // 🔥 查询当前版本的分镜图（添加 is_current=true 过滤）
    const { data: storyboard } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .eq('is_current', true)
      .single<ProjectStoryboard>()

    if (!storyboard) {
      console.error('[Video Agent] ❌ Storyboard not found (is_current=true)', { projectId, shotNumber })
      return NextResponse.json(
        { error: 'Storyboard not found', code: 'STORYBOARD_NOT_FOUND' },
        { status: 404 }
      )
    }

    // ✅ 解析 customPrompt 以获取用户选择的 duration 和 resolution
    let userDuration = shot.duration_seconds || 5
    let userResolution = (shot as any).resolution || getDefaultResolution(project.model_id || 'vidfab-q1') as VideoResolution

    if (customPrompt) {
      try {
        const parsed = JSON.parse(customPrompt)
        if (parsed.duration_seconds) {
          userDuration = parsed.duration_seconds
        }
        if (parsed.resolution && ['480p', '720p', '1080p'].includes(parsed.resolution)) {
          userResolution = parsed.resolution as VideoResolution
        }
        // 持久化用户选择（duration 和 resolution 独立，不互相依赖）
        await supabaseAdmin
          .from('project_shots')
          .update({
            duration_seconds: userDuration,
            resolution: userResolution
          } as any)
          .eq('id', shot.id)
      } catch (e) {
        // 如果 customPrompt 不是 JSON，忽略错误，使用默认值
        console.warn('[Video Agent] Failed to parse customPrompt:', e)
      }
    }

    // ✅ 积分检查 (单个视频) - 使用用户选择的分辨率
    const modelId = project.model_id || 'vidfab-q1'
    const useVeo3 = isVeo3Model(modelId)
    const duration = userDuration
    const resolution = userResolution

    console.log('[Video Agent] Credits calculation:', {
      projectId,
      shotNumber,
      duration,
      resolution,
      useVeo3
    })

    const generateAudio = !project.mute_bgm
    const creditResult = await checkAndDeductSingleVideo(userId, duration, resolution, useVeo3, generateAudio)

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

    deductedCredits = creditResult.requiredCredits  // 记录已扣积分，后续出错可退款

    console.log('[Video Agent] ✅ Credits checked and deducted for retry:', {
      projectId,
      shotNumber,
      model: modelId,
      duration,
      resolution,
      creditsDeducted: creditResult.requiredCredits
    })

    // 🔥 使用 UPSERT 确保记录存在（解决首次生成时没有记录的问题）
    // 🔥 修复：清除旧的视频 URL 和任务 ID，避免数据混乱
    const { error: upsertError } = await supabaseAdmin
      .from('project_video_clips')
      .upsert({
        project_id: projectId,
        shot_number: shotNumber,
        status: 'generating',
        error_message: null,
        retry_count: 0,
        video_url: null,
        video_url_external: null,
        cdn_url: null,
        seedance_task_id: null,
        video_request_id: null,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'project_id,shot_number'
      })

    if (upsertError) {
      console.error('[Video Agent] Failed to upsert video clip:', upsertError)
      await refundUserCredits(userId, deductedCredits)
      return NextResponse.json(
        { error: 'Failed to initialize video clip', code: 'UPSERT_FAILED' },
        { status: 500 }
      )
    }

    // 🎬 BytePlus Seedance: 使用分镜图生成
    // 🔥 重新生成时使用新的随机 seed，确保生成不同的视频
    const newSeed = Math.floor(Math.random() * 1000000)

    // 🔥 智能解析 customPrompt：支持 JSON 字段和纯文本两种格式
    let finalPrompt: string
    let description: string
    let characterAction: string
    let customDuration: number | undefined
    let customResolution: string | undefined

    if (customPrompt && customPrompt.trim()) {
      try {
        // 尝试解析为 JSON 字段
        const parsedFields = JSON.parse(customPrompt)

        if (parsedFields && typeof parsedFields === 'object') {
          // 🔥 JSON 字段模式：提取 description + character_action + duration_seconds + resolution
          description = parsedFields.description || shot.description
          characterAction = parsedFields.character_action || shot.character_action
          customDuration = parsedFields.duration_seconds ? parseInt(parsedFields.duration_seconds, 10) : undefined
          customResolution = parsedFields.resolution || undefined

          console.log(`[Video Agent] 🔄 Using custom fields (JSON mode) for shot ${shotNumber}:`, {
            description: description.substring(0, 50) + '...',
            characterAction: characterAction.substring(0, 50) + '...',
            customDuration: customDuration || shot.duration_seconds,
            customResolution: customResolution || '480p'
          })
        } else {
          // JSON 解析成功但不是对象，作为纯文本处理
          description = customPrompt.trim()
          characterAction = shot.character_action
          console.log(`[Video Agent] 🔄 Using custom description (fallback) for shot ${shotNumber}`)
        }
      } catch {
        // 🔥 纯文本模式（向后兼容）：将整个 customPrompt 作为 description
        description = customPrompt.trim()
        characterAction = shot.character_action
        console.log(`[Video Agent] 🔄 Using custom description (text mode) for shot ${shotNumber}`)
      }
    } else {
      // 使用默认值
      description = shot.description
      characterAction = shot.character_action
    }

    // 构建完整 prompt（包含角色一致性约束和禁止字幕指令）
    finalPrompt = `Maintain exact character appearance and features from the reference image. ${description}. ${characterAction}. Keep all character visual details consistent with the reference. No text, no subtitles, no captions, no words on screen.`

    // 🔥 使用自定义时长（如果有），否则使用原始时长
    const finalDuration = customDuration || shot.duration_seconds
    // 🔥 使用自定义分辨率（如果有），否则与积分计算保持一致（使用 userResolution）
    const finalResolution = customResolution || userResolution

    const videoRequest: VideoGenerationRequest = {
      image: storyboard.image_url,
      prompt: finalPrompt,
      model: 'vidfab-q1',
      duration: finalDuration,  // 🔥 使用自定义时长
      resolution: finalResolution,
      aspectRatio: project.aspect_ratio || '16:9',
      cameraFixed: true,
      watermark: false,
      seed: newSeed  // 🔥 使用新的随机 seed
    }

    console.log(`[Video Agent] 🔄 ${customPrompt ? 'Custom' : 'Enhanced (with character consistency)'} prompt for shot ${shotNumber}:`, finalPrompt.substring(0, 150) + '...')
    console.log(`[Video Agent] 🔄 Using new random seed: ${newSeed} (old: ${shot.seed})`)

    try {
      const result = await submitVideoGeneration(videoRequest, {
        returnLastFrame: true,
        generateAudio
      })

      const { error: byteplusUpdateError } = await supabaseAdmin
        .from('project_video_clips')
        .update({
          seedance_task_id: result.data.id,
          status: 'generating',
          error_message: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)
        .returns<any>()

      if (byteplusUpdateError) {
        console.error(`[Video Agent] ❌ Failed to update BytePlus task ID for shot ${shotNumber}:`, byteplusUpdateError)
        throw new Error(`Failed to save BytePlus task ID: ${byteplusUpdateError.message}`)
      }

      console.log(`[Video Agent] 🔄 BytePlus task ${result.data.id} submitted for shot ${shotNumber}`)
    } catch (submitError: any) {
      // 🔥 检查是否为敏感内容错误
      if (submitError?.code === 'InputTextSensitiveContentDetected') {
        const errorMsg = `Sensitive content detected in prompt. Please modify the description or character action to avoid words like "screaming", "violence", "angry", etc. Current prompt: "${finalPrompt.substring(0, 200)}..."`

        console.error(`[Video Agent] Sensitive content detected for shot ${shotNumber}`)

        // 标记为失败，让用户修改 prompt
        const { error: updateError } = await supabaseAdmin
          .from('project_video_clips')
          .update({
            status: 'failed',
            error_message: errorMsg,
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shotNumber)

        if (updateError) {
          console.error(`[Video Agent] Failed to update status:`, updateError)
        }

        // 敏感内容无法生成，退还积分
        await refundUserCredits(userId, deductedCredits)

        return NextResponse.json(
          {
            error: 'Sensitive content detected',
            message: errorMsg,
            code: 'SENSITIVE_CONTENT'
          },
          { status: 400 }
        )
      }

      // 其他错误直接抛出
      throw submitError
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

    // 发生未预期错误，退还已扣积分
    if (deductedCredits > 0) {
      await refundUserCredits(userId, deductedCredits).catch(refundErr =>
        console.error('[Video Agent] Failed to refund credits after error:', refundErr)
      )
    }

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
})
