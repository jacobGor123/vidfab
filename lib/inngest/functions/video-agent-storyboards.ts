/**
 * Inngest Video Agent Storyboard Generation
 *
 * 说明：Vercel Serverless 环境下不能依赖“请求结束后继续跑 Promise”的后台任务。
 * 分镜图生成需要迁移到 Inngest 执行，保证可靠性、可重试、可观测。
 */

import { inngest } from '../client'
import { logger } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase'
import pLimit from 'p-limit'
import { generateSingleStoryboard, IMAGE_STYLES } from '@/lib/services/video-agent/storyboard-generator'
import type { CharacterConfig, Shot, ImageStyle, ScriptAnalysisResult } from '@/lib/types/video-agent'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectCharacter = Database['public']['Tables']['project_characters']['Row']
type CharacterReferenceImage = Database['public']['Tables']['character_reference_images']['Row']

type CharacterWithFullReferences = ProjectCharacter & {
  character_reference_images: Pick<CharacterReferenceImage, 'image_url' | 'image_order'>[]
}

function getEnvInt(name: string, defaultValue: number): number {
  const raw = process.env[name]
  if (!raw) return defaultValue
  const parsed = Number.parseInt(raw, 10)
  return Number.isFinite(parsed) ? parsed : defaultValue
}

function nowIso() {
  return new Date().toISOString()
}

async function markStoryboardFailed(projectId: string, shotNumber: number, message: string) {
  await supabaseAdmin
    .from('project_storyboards')
    .update({
      status: 'failed',
      error_message: message,
      updated_at: nowIso()
    } as any)
    .eq('project_id', projectId)
    .eq('shot_number', shotNumber)
    .returns<any>()
}

/**
 * Storyboard generation orchestrator
 */
export const generateVideoAgentStoryboards = inngest.createFunction(
  {
    id: 'video-agent-generate-storyboards',
    name: 'Video Agent: Generate Storyboards',
    retries: 2,
    timeout: '15m'
  },
  { event: 'video-agent/storyboards.generate.requested' },
  async ({ event, step }) => {
    const { projectId, userId } = event.data

    const CONCURRENCY = getEnvInt('STORYBOARD_CONCURRENCY', 3)
    const SHOT_TIMEOUT_MS = getEnvInt('STORYBOARD_SHOT_TIMEOUT_MS', 180000)
    const MAX_GENERATING_AGE_MS = getEnvInt('STORYBOARD_MAX_GENERATING_AGE_MS', 600000)

    logger.info('Video Agent storyboard generation started', {
      projectId,
      userId,
      concurrency: CONCURRENCY,
      shotTimeoutMs: SHOT_TIMEOUT_MS,
      maxGeneratingAgeMs: MAX_GENERATING_AGE_MS
    })

    // 1) Load project and validate ownership
    const project = await step.run('load-project', async () => {
      const { data, error } = await supabaseAdmin
        .from('video_agent_projects')
        .select('*')
        .eq('id', projectId)
        .single<VideoAgentProject>()

      if (error || !data) {
        throw new Error(`Project not found: ${projectId}`)
      }
      if (data.user_id !== userId) {
        throw new Error('Access denied')
      }
      return data
    })

    // 2) Self-heal stale generating rows
    await step.run('cleanup-stale-generating', async () => {
      const { data: staleGenerating } = await supabaseAdmin
        .from('project_storyboards')
        .select('shot_number, updated_at, status')
        .eq('project_id', projectId)
        .eq('status', 'generating')
        .returns<any[]>()

      const now = Date.now()
      const staleShotNumbers = (staleGenerating || [])
        .filter((sb) => {
          const ts = sb?.updated_at ? Date.parse(sb.updated_at) : NaN
          if (!Number.isFinite(ts)) return true
          return now - ts > MAX_GENERATING_AGE_MS
        })
        .map((sb) => sb.shot_number)

      if (staleShotNumbers.length === 0) return

      logger.warn('Found stale generating storyboards, marking failed', {
        projectId,
        staleShotNumbers,
        maxGeneratingAgeMs: MAX_GENERATING_AGE_MS
      })

      await supabaseAdmin
        .from('project_storyboards')
        .update({
          status: 'failed',
          error_message: `Stale generating state detected (>${MAX_GENERATING_AGE_MS}ms). Marked failed for recovery.`,
          updated_at: nowIso()
        } as any)
        .eq('project_id', projectId)
        .in('shot_number', staleShotNumbers as any)
        .returns<any>()
    })

    // 3) Fetch characters
    const characters = await step.run('load-characters', async () => {
      const { data: charactersData, error } = await supabaseAdmin
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

      if (error) {
        throw new Error(`Failed to fetch characters: ${error.message}`)
      }

      const configs: CharacterConfig[] = (charactersData || []).map((char) => ({
        name: char.character_name,
        reference_images: (char.character_reference_images || [])
          .sort((a: any, b: any) => a.image_order - b.image_order)
          .map((img: any) => img.image_url)
      }))

      return configs
    })

    // 4) Extract shots
    const shots = await step.run('load-shots', async () => {
      if (!project.script_analysis) {
        throw new Error('Script analysis must be completed first')
      }
      const parsed = project.script_analysis as unknown as ScriptAnalysisResult
      const list: Shot[] = parsed.shots || []
      if (list.length === 0) {
        throw new Error('No shots found in script analysis')
      }
      return list
    })

    // 5) Mark project step_3_status processing
    await step.run('mark-project-processing', async () => {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: 'processing',
          updated_at: nowIso()
        } as any)
        .eq('id', projectId)
        .returns<any>()
    })

    // 6) Generate storyboards with concurrency control
    const styleId = project.image_style_id || 'realistic'
    const style: ImageStyle = (IMAGE_STYLES as any)[styleId] || IMAGE_STYLES.realistic
    const aspectRatio = (project.aspect_ratio || '16:9') as '16:9' | '9:16'

    let successCount = 0
    let failedCount = 0

    const limit = pLimit(CONCURRENCY)

    await step.run('generate-storyboards', async () => {
      const tasks = shots.map((shot) =>
        limit(async () => {
          const startedAt = Date.now()
          const shotNumber = shot.shot_number

          try {
            logger.info('Storyboard generation started', {
              projectId,
              shotNumber
            })

            const timeout = new Promise<never>((_, reject) => {
              const id = setTimeout(() => {
                clearTimeout(id)
                reject(new Error(`Storyboard generation timed out after ${SHOT_TIMEOUT_MS}ms`))
              }, SHOT_TIMEOUT_MS)
            })

            const result = await Promise.race([
              generateSingleStoryboard(shot, characters, style, aspectRatio),
              timeout
            ])

            await supabaseAdmin
              .from('project_storyboards')
              .update({
                image_url: result.image_url,
                status: result.status,
                error_message: result.error,
                updated_at: nowIso()
              } as any)
              .eq('project_id', projectId)
              .eq('shot_number', shotNumber)
              .returns<any>()

            if (result.status === 'success') {
              successCount++
            } else {
              failedCount++
            }

            logger.info('Storyboard generation finished', {
              projectId,
              shotNumber,
              status: result.status,
              durationMs: Date.now() - startedAt
            })
          } catch (err) {
            failedCount++
            const msg = err instanceof Error ? err.message : 'Unknown error'

            await markStoryboardFailed(projectId, shotNumber, msg).catch(() => {
              // 避免单条更新失败导致整个 batch 中断
            })

            logger.error('Storyboard generation failed', err as any, {
              projectId,
              shotNumber,
              durationMs: Date.now() - startedAt
            })
          }
        })
      )

      await Promise.allSettled(tasks)
    })

    // 7) Finalize project status
    const finalStatus =
      failedCount === 0 ? 'completed' : failedCount === shots.length ? 'failed' : 'partial'

    await step.run('mark-project-final', async () => {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_3_status: finalStatus,
          updated_at: nowIso()
        } as any)
        .eq('id', projectId)
        .returns<any>()
    })

    logger.info('Video Agent storyboard generation completed', {
      projectId,
      userId,
      total: shots.length,
      success: successCount,
      failed: failedCount,
      finalStatus
    })

    return {
      success: true,
      projectId,
      total: shots.length,
      successCount,
      failedCount,
      finalStatus
    }
  }
)
