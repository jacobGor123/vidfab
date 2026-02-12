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

        // 立即更新数据库（包含实际使用的人物 IDs）
        await supabaseAdmin
          .from('project_storyboards')
          .update({
            // Keep image_url in sync with the externally accessible URL.
            image_url: result.image_url,
            image_url_external: result.image_url,
            status: result.status,
            error_message: result.error,
            used_character_ids: result.used_character_ids || [],  // 🔥 保存实际使用的人物 IDs
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

    // 转换人物数据格式（保留 ID 用于记录实际使用的人物）
    const characters: CharacterConfig[] = (charactersData || []).map(char => ({
      id: char.id,  // 🔥 保留人物 ID
      name: char.character_name,
      reference_images: (char.character_reference_images || [])
        .sort((a: any, b: any) => a.image_order - b.image_order)
        .map((img: any) => img.image_url)
    }))

    // 🔥 增强日志：记录加载的角色数据
    console.log('[Video Agent] 📊 Loaded characters for storyboard generation:', {
      projectId,
      characterCount: characters.length,
      characters: characters.map(c => ({
        name: c.name,
        imageCount: c.reference_images.length,
        firstImage: c.reference_images[0]?.slice(0, 50)
      }))
    })

    // 获取分镜数据
    const shots: Shot[] = (project.script_analysis as unknown as ScriptAnalysisResult).shots || []

    if (shots.length === 0) {
      return NextResponse.json(
        { error: 'No shots found in script analysis' },
        { status: 400 }
      )
    }

    // 🔥 增强日志：记录加载的 shots 数据（特别是 shot.characters 字段）
    console.log('[Video Agent] 📊 Loaded shots for storyboard generation:', {
      projectId,
      shotCount: shots.length,
      sampleShots: shots.slice(0, 3).map(s => ({
        shot_number: s.shot_number,
        characters: s.characters,
        description: s.description.slice(0, 80)
      }))
    })

    // 🔥 幂等性检查：先查询是否已有记录
    const { data: existingStoryboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .returns<ProjectStoryboard[]>()

    const hasExistingStoryboards = existingStoryboards && existingStoryboards.length > 0

    if (hasExistingStoryboards) {
      const hasGenerating = existingStoryboards.some(sb => sb.status === 'generating')

      // 🔥 修复：只阻止重复生成中的请求，允许重新生成已完成的分镜图
      // 这样用户更换人物后可以重新生成分镜图
      if (hasGenerating) {
        return NextResponse.json({
          success: true,
          data: {
            message: 'Storyboard generation already in progress',
            total: existingStoryboards.length,
            alreadyStarted: true
          }
        })
      }

      // 如果有已完成的记录，删除它们，允许重新生成
      console.log('[Video Agent] Found existing completed storyboards, will regenerate')
    }

    // 🔥 没有记录或记录都是 failed 状态，创建新的 generating 记录
    const initialStoryboards = shots.map(shot => ({
      project_id: projectId,
      shot_number: shot.shot_number,
      status: 'generating',
      generation_attempts: 1,
      version: 1,          // 🔥 新增：初始版本号
      is_current: true     // 🔥 新增：标记为当前版本
    }))

    const { data: insertedStoryboards, error: insertError } = await supabaseAdmin
      .from('project_storyboards')
      .upsert(initialStoryboards as any, {
        onConflict: 'project_id,shot_number,version',  // 🔥 修复：使用新的唯一约束
        ignoreDuplicates: false
      })
      .select()

    if (insertError) {
      console.error('[Video Agent] ❌ Failed to create storyboard records:', insertError)
      // 🔥 修复：插入失败应该立即返回错误，不能继续生成
      return NextResponse.json({
        success: false,
        error: 'Failed to initialize storyboard records',
        details: insertError.message
      }, { status: 500 })
    }

    // 🔥 验证所有 shot 都成功插入
    if (!insertedStoryboards || insertedStoryboards.length !== shots.length) {
      console.error('[Video Agent] ❌ Incomplete storyboard records:', {
        expected: shots.length,
        inserted: insertedStoryboards?.length || 0
      })
      return NextResponse.json({
        success: false,
        error: 'Failed to create all storyboard records',
        expected: shots.length,
        inserted: insertedStoryboards?.length || 0
      }, { status: 500 })
    }

    console.log('[Video Agent] ✅ All storyboard records initialized:', {
      count: insertedStoryboards.length,
      shotNumbers: insertedStoryboards.map((s: any) => s.shot_number).sort()
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

    // 🔥 队列系统开关
    // - 设置 ENABLE_QUEUE=true 可在任意环境启用队列（需要运行 Worker）
    // - 默认：开发环境同步生成，生产环境使用队列
    const USE_QUEUE = process.env.ENABLE_QUEUE === 'true'

    if (USE_QUEUE) {
      // 使用队列系统（替代后台 Promise）
      // 优点：任务持久化、自动重试、不会被 Vercel Lambda 打断
      const { videoQueueManager } = await import('@/lib/queue/queue-manager')

      try {
        // 🔥 修复：为重新生成添加时间戳，确保 jobId 唯一（避免 BullMQ 拒绝重复任务）
        const timestamp = Date.now()
        const jobId = await videoQueueManager.addJob(
          'storyboard_generation',
          {
            jobId: `storyboard_${projectId}_${timestamp}`,
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

        // Also enqueue a follow-up job that will download/store the generated images.
        // This prevents the UI from being stuck with external signed URLs.
        await videoQueueManager.addJob(
          'storyboard_download',
          {
            jobId: `storyboard_download_batch_${projectId}`,
            userId,
            videoId: projectId,
            projectId,
            shotNumber: 0,
            externalUrl: '__BATCH__',
            createdAt: new Date().toISOString(),
          } as any,
          {
            priority: 'high',
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            delay: 2000,
            removeOnComplete: 10,
            removeOnFail: 20,
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
      // 🔥 修复：使用"快速返回 + 后台异步处理"模式
      // 立即返回成功，分镜图在后台异步生成
      // 这样可以避免 Vercel 300 秒超时问题
      console.log('[Video Agent] 🔧 Using async background generation (no queue)')

      // 🔥 关键：不使用 await，让生成任务在后台执行
      // 但需要确保不会被 Vercel 过早终止
      // 使用 waitUntil 模式（如果可用）或者直接后台执行
      const generateInBackground = async () => {
        try {
          const { batchGenerateStoryboardsWithProgress } = await import('@/lib/services/video-agent/processors/storyboard/storyboard-batch-generator')
          const { videoQueueManager } = await import('@/lib/queue/queue-manager')

          const result = await batchGenerateStoryboardsWithProgress(
            projectId,
            shots,
            characters,
            style,
            project.aspect_ratio || '16:9'
          )

          // After generation, enqueue storage downloads for all successful shots.
          // We do this from the route layer (not the generator layer) to keep SSRF controls centralized.
          const { data: sbs } = await supabaseAdmin
            .from('project_storyboards')
            .select('shot_number, image_url_external, status, storage_status')
            .eq('project_id', projectId)
            .returns<any[]>()

          const toDownload = (sbs || [])
            .filter((sb) => sb?.status === 'success')
            .filter((sb) => sb?.storage_status === 'pending' || !sb?.storage_status)
            .filter((sb) => typeof sb?.image_url_external === 'string' && sb.image_url_external.length > 0)

          if (toDownload.length > 0) {
            // 🛡️ 防止副作用：查询每个分镜图的实际版本 ID，确保唯一性
            const { data: storyboardsWithIds } = await supabaseAdmin
              .from('project_storyboards')
              .select('id, shot_number')
              .eq('project_id', projectId)
              .eq('is_current', true)
              .in('shot_number', toDownload.map(sb => sb.shot_number))
              .returns<any[]>()

            const idMap = new Map((storyboardsWithIds || []).map(sb => [sb.shot_number, sb.id]))

            await Promise.allSettled(
              toDownload.map((sb) => {
                const storyboardId = idMap.get(sb.shot_number)
                if (!storyboardId) {
                  console.warn(`[Video Agent] No storyboard ID found for shot ${sb.shot_number}`)
                  return Promise.resolve()
                }

                // 🛡️ 使用版本 ID 作为 jobId 的一部分，避免重复下载
                const uniqueJobId = `storyboard_download_${projectId}_${sb.shot_number}_${storyboardId}`

                return videoQueueManager.addJob(
                  'storyboard_download',
                  {
                    jobId: uniqueJobId,
                    userId,
                    videoId: projectId,
                    projectId,
                    shotNumber: sb.shot_number,
                    storyboardId,  // 🔥 传递版本 ID
                    externalUrl: sb.image_url_external,
                    createdAt: new Date().toISOString(),
                  } as any,
                  {
                    priority: 'low',  // 🔥 改为低优先级，不影响视频生成
                    attempts: 3,
                    removeOnComplete: true,
                    removeOnFail: false
                  }
                )
              })
            )

            console.log(`[Video Agent] Queued ${toDownload.length} storyboard downloads`)
          }

          console.log('[Video Agent] Background generation completed:', {
            total: result.total,
            completed: result.completed,
            failed: result.failed,
            finalStatus: result.finalStatus
          })
        } catch (genError) {
          console.error('[Video Agent] ❌ Background generation failed:', genError)

          // 更新项目状态为失败
          await supabaseAdmin
            .from('video_agent_projects')
            .update({
              step_3_status: 'failed'
            } as any)
            .eq('id', projectId)
        }
      }

      // 🔥 不等待，立即在后台执行
      // 注意：在 Vercel 中，一旦响应返回，后台任务可能被终止
      // 但由于我们已经创建了 'generating' 状态的记录，前端会轮询状态
      // 如果任务被终止，前端可以触发重试
      generateInBackground().catch(err => {
        console.error('[Video Agent] Background task error:', err)
      })

      // 立即返回成功
      return NextResponse.json({
        success: true,
        data: {
          message: 'Storyboard generation started',
          total: shots.length,
          async: true
        }
      })
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
