/**
 * Video Agent - 分镜图生成 API
 * 批量生成分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import type { CharacterConfig, Shot, ImageStyle, ScriptAnalysisResult } from '@/lib/types/video-agent'
import type { Database } from '@/lib/database.types'
import { inngest } from '@/lib/inngest/client'

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
 * 说明：
 * 分镜图生成已迁移到 Inngest Cloud 执行。
 * 这个 route 只负责初始化分镜记录并触发 Inngest 事件。
 */
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

    // 🔥 幂等性检查：检查是否已存在分镜图记录
    const { data: existingStoryboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .returns<ProjectStoryboard[]>()

    const hasExistingStoryboards = existingStoryboards && existingStoryboards.length > 0

    if (hasExistingStoryboards) {
      const hasGenerating = existingStoryboards.some(sb => sb.status === 'generating')
      const hasCompleted = existingStoryboards.some(sb => sb.status === 'success')

      if (hasGenerating || hasCompleted) {
        console.log('[Video Agent] Storyboard generation already started', {
          projectId,
          totalStoryboards: existingStoryboards.length,
          hasGenerating,
          hasCompleted
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
        step_3_status: 'processing',
        updated_at: new Date().toISOString()
      } as any)
      .eq('id', projectId)
      .returns<any>()

    // 立即在数据库中创建所有分镜记录（幂等）
    // 说明：不要无条件把 status 覆盖成 generating，否则重复点击/重复触发会把已完成的记录回写成 generating。
    const initialStoryboards = shots.map(shot => ({
      project_id: projectId,
      shot_number: shot.shot_number,
      generation_attempts: 1,
      updated_at: new Date().toISOString()
    }))

    const { error: insertError } = await supabaseAdmin
      .from('project_storyboards')
      .upsert(initialStoryboards as any, {
        onConflict: 'project_id,shot_number',
        ignoreDuplicates: true
      })

    if (insertError) {
      console.error('[Video Agent] Failed to initialize storyboards:', insertError)
      return NextResponse.json(
        { error: 'Failed to initialize storyboards' },
        { status: 500 }
      )
    }

    // 如果是首次初始化，确保 status 从 pending 进入 generating
    // （只更新尚未进入终态的记录，避免覆盖 success/failed）
    const { error: setGeneratingError } = await supabaseAdmin
      .from('project_storyboards')
      .update({
        status: 'generating',
        updated_at: new Date().toISOString()
      } as any)
      .eq('project_id', projectId)
      .not('status', 'in', '(success,failed)')
      .returns<any>()

    if (setGeneratingError) {
      console.warn('[Video Agent] Failed to set generating status (non-fatal):', setGeneratingError)
    }

    console.log('[Video Agent] Storyboard generation started (queued via Inngest)', {
      projectId,
      shotCount: shots.length
    })

    // ✅ 说明：Suno 背景音乐生成已不再在 Step3 触发
    // 现在 bgm 模式在最终合成阶段使用预设 CDN 背景音乐，不需要在这里生成。

    // ✅ 迁移到 Inngest Cloud：可靠后台执行，避免 Vercel Serverless 回收导致卡 generating
    await inngest.send({
      name: 'video-agent/storyboards.generate.requested',
      data: {
        projectId,
        userId
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
