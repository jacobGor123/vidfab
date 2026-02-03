/**
 * Video Agent - 单个视频重新生成 API
 * POST: 重新生成指定的视频片段
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { submitVideoGeneration } from '@/lib/services/byteplus/video/seedance-api'
import { VideoGenerationRequest } from '@/lib/types/video'
import {
  generateVeo3Video,
  getVideoGenerationImages
} from '@/lib/services/video-agent/veo3-video-generator'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']
type ProjectStoryboard = Database['public']['Tables']['project_storyboards']['Row']

/**
 * 重新生成单个视频片段
 * POST /api/video-agent/projects/[id]/videos/[shotNumber]/retry
 */
export const POST = withAuth(async (request, { params, userId }) => {
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
      .single<ProjectShot>()

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
      .single<ProjectStoryboard>()

    if (!storyboard) {
      return NextResponse.json(
        { error: 'Storyboard not found', code: 'STORYBOARD_NOT_FOUND' },
        { status: 404 }
      )
    }

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
      return NextResponse.json(
        { error: 'Failed to initialize video clip', code: 'UPSERT_FAILED' },
        { status: 500 }
      )
    }

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
        .single<ProjectStoryboard>()

      const images = getVideoGenerationImages(
        { imageUrl: storyboard.image_url },
        nextStoryboard ? { imageUrl: nextStoryboard.image_url } : undefined
      )

      if (!images) {
        throw new Error('No reference image available for Veo3.1 generation')
      }

      // 🔥 智能解析 customPrompt：支持 JSON 字段和纯文本两种格式
      // ✅ Unified prompt model: description (shot framing) + character_action (what happens).
      // The UI now edits character_action separately and sends both fields in JSON mode.
      let finalPrompt: string
      let customDuration: number | undefined

      if (customPrompt && customPrompt.trim()) {
        try {
          // 尝试解析为 JSON 字段
          const parsedFields = JSON.parse(customPrompt)

          if (parsedFields && typeof parsedFields === 'object') {
            // 🔥 JSON 字段模式：提取 description + character_action + duration_seconds
            const description = parsedFields.description || shot.description
            const characterAction = parsedFields.character_action || shot.character_action
            customDuration = parsedFields.duration_seconds ? parseInt(parsedFields.duration_seconds, 10) : undefined

            finalPrompt = `${description}. ${characterAction}`.trim()
            console.log(`[Video Agent] 🔄 Using custom fields (JSON mode) for shot ${shotNumber}:`, {
              description: description.substring(0, 50) + '...',
              characterAction: String(characterAction || '').substring(0, 50) + '...',
              customDuration: customDuration || shot.duration_seconds
            })
          } else {
            // JSON 解析成功但不是对象，作为纯文本处理
            finalPrompt = customPrompt.trim()
            console.log(`[Video Agent] 🔄 Using custom description (fallback) for shot ${shotNumber}`)
          }
        } catch {
          // 🔥 纯文本模式（向后兼容）：将整个 customPrompt 作为 description
          finalPrompt = customPrompt.trim()
          console.log(`[Video Agent] 🔄 Using custom description (text mode) for shot ${shotNumber}`)
        }
      } else {
        // 默认：description + character_action
        finalPrompt = `${shot.description}. ${shot.character_action}`.trim()
      }

      // 🔥 强制添加禁止字幕指令
      if (!finalPrompt.includes('No text') && !finalPrompt.includes('no subtitles')) {
        finalPrompt += '. No text, no subtitles, no captions, no words on screen.'
      }

      // 🔥 使用自定义时长（如果有），否则使用原始时长
      const finalDuration = customDuration || shot.duration_seconds

      const { requestId } = await generateVeo3Video({
        prompt: finalPrompt,
        image: images.image,
        aspectRatio: project.aspect_ratio || '16:9',
        duration: finalDuration,  // 🔥 使用自定义时长
        lastImage: images.lastImage
      })

      console.log(`[Video Agent] 🔄 ${customPrompt ? 'Custom' : 'Enhanced'} prompt for shot ${shotNumber}:`, finalPrompt)

      const { error: veo3UpdateError } = await supabaseAdmin
        .from('project_video_clips')
        .update({
          video_request_id: requestId,
          video_status: 'generating',
          status: 'generating',
          error_message: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('project_id', projectId)
        .eq('shot_number', shotNumber)
        .returns<any>()

      if (veo3UpdateError) {
        console.error(`[Video Agent] ❌ Failed to update Veo3 task ID for shot ${shotNumber}:`, veo3UpdateError)
        throw new Error(`Failed to save Veo3 task ID: ${veo3UpdateError.message}`)
      }

      console.log(`[Video Agent] 🔄 Veo3.1 task ${requestId} submitted for shot ${shotNumber}`)

    } else {
      // 🎬 BytePlus Seedance: 使用分镜图生成
      // 🔥 重新生成时使用新的随机 seed，确保生成不同的视频
      const newSeed = Math.floor(Math.random() * 1000000)

      // 🔥 智能解析 customPrompt：支持 JSON 字段和纯文本两种格式
      let finalPrompt: string
      let description: string
      let characterAction: string
      let customDuration: number | undefined

      if (customPrompt && customPrompt.trim()) {
        try {
          // 尝试解析为 JSON 字段
          const parsedFields = JSON.parse(customPrompt)

          if (parsedFields && typeof parsedFields === 'object') {
            // 🔥 JSON 字段模式：提取 description + character_action + duration_seconds
            description = parsedFields.description || shot.description
            characterAction = parsedFields.character_action || shot.character_action
            customDuration = parsedFields.duration_seconds ? parseInt(parsedFields.duration_seconds, 10) : undefined

            console.log(`[Video Agent] 🔄 Using custom fields (JSON mode) for shot ${shotNumber}:`, {
              description: description.substring(0, 50) + '...',
              characterAction: characterAction.substring(0, 50) + '...',
              customDuration: customDuration || shot.duration_seconds
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

      const videoRequest: VideoGenerationRequest = {
        image: storyboard.image_url,
        prompt: finalPrompt,
        model: 'vidfab-q1',
        duration: finalDuration,  // 🔥 使用自定义时长
        resolution: '720p',  // 🔥 修复：使用 720p（更快，缓存优化）
        aspectRatio: project.aspect_ratio || '16:9',
        cameraFixed: true,
        watermark: false,
        seed: newSeed  // 🔥 使用新的随机 seed
      }

      console.log(`[Video Agent] 🔄 ${customPrompt ? 'Custom' : 'Enhanced (with character consistency)'} prompt for shot ${shotNumber}:`, finalPrompt.substring(0, 150) + '...')
      console.log(`[Video Agent] 🔄 Using new random seed: ${newSeed} (old: ${shot.seed})`)

      try {
        const result = await submitVideoGeneration(videoRequest, {
          returnLastFrame: true
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
})
