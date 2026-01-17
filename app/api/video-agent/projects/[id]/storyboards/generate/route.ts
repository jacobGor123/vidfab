/**
 * Video Agent - 分镜图生成 API
 * 批量生成分镜图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateSingleStoryboard, IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import type { CharacterConfig, Shot, ImageStyle, ScriptAnalysisResult } from '@/lib/types/video-agent'
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

  let successCount = 0
  let failedCount = 0

  // ✅ 使用 p-limit 库
  const limit = pLimit(CONCURRENCY)

  const tasks = shots.map((shot) =>
    limit(async () => {
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
          } as any)
          .eq('project_id', projectId)
          .eq('shot_number', shot.shot_number)
          .returns<any>()

        if (result.status === 'success') {
          successCount++
        } else {
          failedCount++
        }

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

    // 🔥 幂等性检查：先查询是否已有记录
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

    // 🔥 没有记录或记录都是 failed 状态，创建新的 generating 记录
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
        ignoreDuplicates: false
      })
      .select()

    if (insertError) {
      console.error('[Video Agent] Failed to create storyboard records:', insertError)
    }

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

    // 🔥 队列系统开关
    // - 设置 ENABLE_QUEUE=true 可在任意环境启用队列（需要运行 Worker）
    // - 默认：开发环境同步生成，生产环境使用队列
    const USE_QUEUE = process.env.ENABLE_QUEUE === 'true'

    if (USE_QUEUE) {
      // 使用队列系统（替代后台 Promise）
      // 优点：任务持久化、自动重试、不会被 Vercel Lambda 打断
      const { videoQueueManager } = await import('@/lib/queue/queue-manager')

      try {
        const jobId = await videoQueueManager.addJob(
          'storyboard_generation',
          {
            jobId: `storyboard_${projectId}`,
            userId: userId,
            videoId: projectId,
            projectId,
            shots,
            characters,
            style: styleId,
            aspectRatio: project.aspect_ratio || '16:9',
            createdAt: new Date().toISOString()
          },
          {
            priority: 'high',
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 5000
            },
            removeOnComplete: 10,
            removeOnFail: 20
          }
        )

        return NextResponse.json({
          success: true,
          data: {
            message: 'Storyboard generation queued',
            jobId,
            total: shots.length
          }
        })

      } catch (queueError) {
        console.error('[Video Agent] ❌ Failed to queue storyboard generation:', queueError)

        // 队列失败，更新项目状态
        await supabaseAdmin
          .from('video_agent_projects')
          .update({
            step_3_status: 'failed'
          } as any)
          .eq('id', projectId)

        return NextResponse.json({
          success: false,
          error: 'Failed to queue storyboard generation'
        }, { status: 500 })
      }
    } else {
      // 🔥 开发环境：直接在 API 中同步生成（无需 Worker）
      console.log('[Video Agent] 🔧 Using direct generation (no queue)')

      try {
        // 使用完整的批量生成函数（带进度回调和错误处理）
        const { batchGenerateStoryboardsWithProgress } = await import('@/lib/services/video-agent/processors/storyboard/storyboard-batch-generator')

        const result = await batchGenerateStoryboardsWithProgress(
          projectId,
          shots,
          characters,
          style,
          project.aspect_ratio || '16:9'
        )

        console.log('[Video Agent] Direct generation completed:', {
          total: result.total,
          completed: result.completed,
          failed: result.failed,
          finalStatus: result.finalStatus
        })

        return NextResponse.json({
          success: true,
          data: {
            message: 'Storyboard generation completed',
            total: result.total,
            completed: result.completed,
            failed: result.failed,
            finalStatus: result.finalStatus
          }
        })
      } catch (genError) {
        console.error('[Video Agent] ❌ Direct generation failed:', genError)

        // 更新项目状态为失败
        await supabaseAdmin
          .from('video_agent_projects')
          .update({
            step_3_status: 'failed'
          } as any)
          .eq('id', projectId)

        return NextResponse.json({
          success: false,
          error: 'Failed to generate storyboards'
        }, { status: 500 })
      }
    }

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
