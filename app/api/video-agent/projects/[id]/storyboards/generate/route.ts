/**
 * Video Agent - 分镜图生成 API
 * 批量生成分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import {
  generateSingleStoryboard,
  CharacterConfig,
  Shot,
  IMAGE_STYLES,
  ImageStyle
} from '@/lib/services/video-agent/storyboard-generator'
import { sunoAPI } from '@/lib/services/suno/suno-api'

/**
 * 异步生成分镜图（后台任务）
 * 生成完一张立即更新数据库
 */
async function generateStoryboardsAsync(
  projectId: string,
  shots: Shot[],
  characters: CharacterConfig[],
  style: ImageStyle,
  aspectRatio: '16:9' | '9:16' = '16:9'
) {
  console.log('[Video Agent] Starting async storyboard generation', {
    projectId,
    shotCount: shots.length,
    aspectRatio
  })

  let successCount = 0
  let failedCount = 0

  // 并行生成所有分镜图，每完成一张立即保存
  const generatePromises = shots.map(async (shot) => {
    try {
      const result = await generateSingleStoryboard(shot, characters, style, aspectRatio)

      // 立即更新数据库
      await supabaseAdmin
        .from('project_storyboards')
        .update({
          image_url: result.image_url,
          status: result.status,
          error_message: result.error,
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', shot.shot_number)

      if (result.status === 'success') {
        successCount++
      } else {
        failedCount++
      }

      console.log('[Video Agent] Storyboard generated', {
        projectId,
        shotNumber: shot.shot_number,
        status: result.status,
        progress: `${successCount + failedCount}/${shots.length}`
      })

      return result
    } catch (error) {
      failedCount++
      console.error('[Video Agent] Failed to generate storyboard:', error)

      // 更新为失败状态
      await supabaseAdmin
        .from('project_storyboards')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('project_id', projectId)
        .eq('shot_number', shot.shot_number)

      return null
    }
  })

  // 等待所有生成完成
  await Promise.allSettled(generatePromises)

  // 更新项目状态
  const finalStatus = failedCount === 0 ? 'completed' : failedCount === shots.length ? 'failed' : 'partial'
  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      step_3_status: finalStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', projectId)

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
    const shots: Shot[] = project.script_analysis.shots || []

    if (shots.length === 0) {
      return NextResponse.json(
        { error: 'No shots found in script analysis' },
        { status: 400 }
      )
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
      })
      .eq('id', projectId)

    // 立即在数据库中创建所有分镜记录，状态为 'generating'
    const initialStoryboards = shots.map(shot => ({
      project_id: projectId,
      shot_number: shot.shot_number,
      status: 'generating',
      generation_attempts: 1
    }))

    const { error: insertError } = await supabaseAdmin
      .from('project_storyboards')
      .upsert(initialStoryboards, {
        onConflict: 'project_id,shot_number'
      })

    if (insertError) {
      console.error('[Video Agent] Failed to initialize storyboards:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize storyboards' },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Storyboard generation started (async)', {
      projectId,
      shotCount: shots.length
    })

    // 🔥 并行启动 Suno 音乐生成（如果有 music_generation_prompt）
    if (project.music_generation_prompt) {
      Promise.resolve().then(async () => {
        try {
          console.log('[Video Agent] 🎵 Starting parallel Suno music generation', {
            projectId,
            promptLength: project.music_generation_prompt.length
          })

          // 启动 Suno 音乐生成（不等待完成）
          const generateResponse = await sunoAPI.generate({
            prompt: project.music_generation_prompt,
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
            })
            .eq('id', projectId)

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
    }

    // 立即返回，后台异步生成
    // 使用 Promise.resolve().then() 确保在当前请求之后执行
    Promise.resolve().then(async () => {
      await generateStoryboardsAsync(
        projectId,
        shots,
        characters,
        style,
        project.aspect_ratio || '16:9'
      )
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
        })
        .eq('id', params.id)
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
}

/**
 * 获取分镜图生成状态
 * GET /api/video-agent/projects/[id]/storyboards/generate
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('step_3_status')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

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
}
