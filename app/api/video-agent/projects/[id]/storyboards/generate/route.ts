/**
 * Video Agent - 分镜图生成 API
 * 批量生成分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSingleStoryboard, IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import type { CharacterConfig, Shot, ImageStyle, ScriptAnalysisResult } from '@/lib/types/video-agent'
import { sunoAPI } from '@/lib/services/suno/suno-api'
import type { Database } from '@/lib/database.types'
import pLimit from 'p-limit'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectStoryboard = Database['public']['Tables']['project_storyboards']['Row']
type ProjectCharacter = Database['public']['Tables']['project_characters']['Row']
type CharacterReferenceImage = Database['public']['Tables']['character_reference_images']['Row']

// 人物查询结果类型（包含关联的参考图）
type CharacterWithReferences = Pick<ProjectCharacter, 'character_name'> & {
  character_reference_images: Pick<CharacterReferenceImage, 'image_url' | 'image_order'>[]
}

// 完整人物查询结果（包含所有字段和参考图）
type CharacterWithFullReferences = ProjectCharacter & {
  character_reference_images: Pick<CharacterReferenceImage, 'image_url' | 'image_order'>[]
}

/**
 * ✅ 优化：使用 p-limit 库替代自己实现的并发控制
 * 避免自己实现的 Bug（splice 逻辑错误）
 */

/**
 * ✅ 优化后的分镜图生成函数
 *
 * 关键改进：
 * - 使用 p-limit 库（稳定可靠）
 * - 并发数 3（可配置）
 * - 生成完一张立即更新数据库
 */
async function generateStoryboardsAsync(
  projectId: string,
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9'
) {
  const CONCURRENCY = parseInt(process.env.STORYBOARD_CONCURRENCY || '3', 10)

  console.log('[Video Agent] Starting async storyboard generation', {
    projectId,
    shotCount: shots.length,
    aspectRatio,
    concurrency: CONCURRENCY
  })

  let successCount = 0
  let failedCount = 0

  // ✅ 使用 p-limit 库
  const limit = pLimit(CONCURRENCY)

  const tasks = shots.map((shot) =>
    limit(async () => {
      try {
        console.log('[Video Agent] 🎬 Starting storyboard generation', {
          shotNumber: shot.shot_number,
          progress: `${successCount + failedCount + 1}/${shots.length}`
        })

        const result = await generateSingleStoryboard(shot, characters, style, aspectRatio)

        // 立即更新数据库
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            image_url: result.image_url,
            status: result.status,
            error_message: result.error,
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
          .returns<any>()

        if (result.status === 'success') {
          successCount++
        } else {
          failedCount++
        }

        console.log('[Video Agent] ✅ Storyboard generated', {
          projectId,
          shotNumber: shot.shot_number,
          status: result.status,
          progress: `${successCount + failedCount}/${shots.length}`
        })

        return result
      } catch (error) {
        failedCount++
        console.error('[Video Agent] ❌ Failed to generate storyboard:', error)

        // 更新为失败状态
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            status: 'failed',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            updated_at: new Date().toISOString()
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
          .returns<any>()

        return null
      }
    })
  )

  // ✅ 使用 Promise.allSettled 等待所有任务完成
  await Promise.allSettled(tasks)

  // 更新项目状态
  const finalStatus = failedCount === 0 ? 'completed' : failedCount === shots.length ? 'failed' : 'partial'
  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      step_3_status: finalStatus,
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', projectId)
    .returns<any>()

  console.log('[Video Agent] Async storyboard generation completed', {
    projectId,
    total: shots.length,
    success: successCount,
    failed: failedCount,
    finalStatus
  })
}

/**
 * 批量生成分镜图
 * POST /api/video-agent/projects/[id]/storyboards/generate
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
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 检查是否已完成脚本分析
    if (!project.script_analysis) {
      return NextResponse.json(
        { error: 'Script analysis must be completed first' },
        { status: 400 }
      )
    }

    // 使用默认风格（用户已通过人物参考图确定风格）
    const styleId = 'realistic'
    const style = IMAGE_STYLES[styleId]

    // 获取人物配置
    const { data: charactersData, error: charsError } = await supabaseAdmin
      .from('project_characters')
      .select(`
        *,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .order('created_at')
      .returns<CharacterWithFullReferences[]>()

    if (charsError) {
      console.error('[Video Agent] Failed to fetch characters:', charsError)
      return NextResponse.json(
        { error: 'Failed to fetch characters' },
        { status: 500 }
      )
    }

    // 转换人物数据格式
    const characters: CharacterConfig[] = (charactersData || []).map(char => ({
      name: char.character_name,
      reference_images: (char.character_reference_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url)
    }))

    // 获取分镜数据
    const shots: Shot[] = (project.script_analysis as unknown as ScriptAnalysisResult).shots || []

    if (shots.length === 0) {
      return NextResponse.json(
        { error: 'No shots found in script analysis' },
        { status: 400 }
      )
    }

    // 🔥 改进的幂等性检查：先尝试插入，通过数据库唯一约束来保证幂等性
    // 立即在数据库中创建所有分镜记录，状态为 'generating'
    const initialStoryboards = shots.map(shot => ({
      project_id: projectId,
      shot_number: shot.shot_number,
      status: 'generating',
      generation_attempts: 1
    }))

    const { data: insertedStoryboards, error: insertError } = await supabaseAdmin
      .from('project_storyboards')
      .upsert(initialStoryboards as any, {
        onConflict: 'project_id,shot_number',
        ignoreDuplicates: false  // 🔥 关键：返回已存在的记录
      })
      .select()

    // 🔥 如果返回为空或数量不匹配，说明已经有记录存在（被其他请求创建了）
    // 检查现有记录的状态
    const { data: existingStoryboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .returns<ProjectStoryboard[]>()

    const hasExistingStoryboards = existingStoryboards && existingStoryboards.length > 0

    if (hasExistingStoryboards) {
      const hasGenerating = existingStoryboards.some(sb => sb.status === 'generating')
      const hasCompleted = existingStoryboards.some(sb => sb.status === 'success')

      // 🔥 如果已经有生成中或已完成的记录，直接返回
      if (hasGenerating || hasCompleted) {
        console.log('[Video Agent] Storyboard generation already in progress or completed', {
          projectId,
          totalStoryboards: existingStoryboards.length,
          hasGenerating,
          hasCompleted,
          statusBreakdown: {
            generating: existingStoryboards.filter(sb => sb.status === 'generating').length,
            success: existingStoryboards.filter(sb => sb.status === 'success').length,
            failed: existingStoryboards.filter(sb => sb.status === 'failed').length
          }
        })

        return NextResponse.json({
          success: true,
          data: {
            message: 'Storyboard generation already started',
            total: existingStoryboards.length,
            alreadyStarted: true
          }
        })
      }
    }

    console.log('[Video Agent] Starting storyboard generation', {
      projectId,
      shotCount: shots.length,
      characterCount: characters.length,
      characters: characters.map(c => ({
        name: c.name,
        referenceImageCount: c.reference_images.length,
        referenceImages: c.reference_images
      })),
      shotCharacters: shots.map(s => ({
        shotNumber: s.shot_number,
        characters: s.characters
      })),
      style: style.name
    })

    // 更新项目状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        // 不更新 current_step，由前端在用户点击"继续"时更新
        step_3_status: 'processing'
      } as any)
      .eq('id', projectId)
      .returns<any>()

    // 🔥 删除：已在上面的幂等性检查中完成插入

    console.log('[Video Agent] Storyboard generation started (async)', {
      projectId,
      shotCount: shots.length
    })

    // 🔥 并行启动 Suno 音乐生成（仅非旁白模式且未静音 BGM）
    // 旁白模式下不生成背景音乐，避免与旁白音频冲突
    // mute_bgm 为 true 时也不生成背景音乐
    if (project.music_generation_prompt && !project.enable_narration && !project.mute_bgm) {
      const musicPrompt = project.music_generation_prompt // 保存到局部变量避免类型检查问题
      Promise.resolve().then(async () => {
        try {
          console.log('[Video Agent] 🎵 Starting parallel Suno music generation', {
            projectId,
            promptLength: musicPrompt.length,
            mode: 'background-music'
          })

          // 启动 Suno 音乐生成（不等待完成）
          const generateResponse = await sunoAPI.generate({
            prompt: musicPrompt,
            make_instrumental: true, // 🔥 纯音乐（无歌词），更适合背景音乐
            wait_audio: false
          })

          const sunoTaskId = generateResponse.id

          // 保存 Suno task ID
          await supabaseAdmin
            .from('video_agent_projects')
            .update({
              suno_task_id: sunoTaskId,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', projectId)
            .returns<any>()

          console.log('[Video Agent] 🎵 Suno music generation started (parallel)', {
            projectId,
            taskId: sunoTaskId,
            status: generateResponse.status
          })
        } catch (error) {
          console.error('[Video Agent] ⚠️ Failed to start Suno music generation (non-critical):', error)
          // 音乐生成失败不影响主流程
        }
      })
    } else {
      if (project.enable_narration) {
        console.log('[Video Agent] 🎵 Skipping music generation (narration mode enabled)', { projectId })
      } else if (project.mute_bgm) {
        console.log('[Video Agent] 🎵 Skipping music generation (BGM muted)', { projectId })
      }
    }

    // 立即返回，后台异步生成
    // 使用 Promise.resolve().then() 确保在当前请求之后执行
    Promise.resolve().then(async () => {
      try {
        console.log('[Video Agent] 🚀 Starting background storyboard generation', {
          projectId,
          shotCount: shots.length,
          aspectRatio: project.aspect_ratio || '16:9'
        })

        await generateStoryboardsAsync(
          projectId,
          shots,
          characters,
          style,
          project.aspect_ratio || '16:9'
        )

        console.log('[Video Agent] ✅ Background storyboard generation completed', { projectId })
      } catch (error) {
        console.error('[Video Agent] ❌ Background storyboard generation failed:', error)

        // 🔥 失败时更新项目状态
        try {
          await supabaseAdmin
            .from('video_agent_projects')
            .update({
              step_3_status: 'failed'
            } as any)
            .eq('id', projectId)
        } catch (updateError) {
          console.error('[Video Agent] Failed to update project status after error:', updateError)
        }
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: 'Storyboard generation started',
        total: shots.length
      }
    })

  } catch (error) {
    console.error('[Video Agent] Generate storyboards error:', error)

    // 更新项目状态为失败
    try {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: 'failed'
        } as any)
        .eq('id', params.id)
        .returns<any>()
    } catch (updateError) {
      console.error('[Video Agent] Failed to update project status:', updateError)
    }

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})

/**
 * 获取分镜图生成状态
 * GET /api/video-agent/projects/[id]/storyboards/generate
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('step_3_status')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 获取分镜图数据
    const { data: storyboards, error } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number')

    if (error) {
      console.error('[Video Agent] Failed to fetch storyboards:', error)
      return NextResponse.json(
        { error: 'Failed to fetch storyboards' },
        { status: 500 }
      )
    }

    const successCount = (storyboards || []).filter(s => s.status === 'success').length
    const failedCount = (storyboards || []).filter(s => s.status === 'failed').length

    return NextResponse.json({
      success: true,
      data: {
        status: project.step_3_status,
        total: storyboards?.length || 0,
        success: successCount,
        failed: failedCount,
        storyboards: storyboards || []
      }
    })

  } catch (error) {
    console.error('[Video Agent] Get storyboards status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
