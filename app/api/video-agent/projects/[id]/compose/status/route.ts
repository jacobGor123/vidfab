/**
 * Video Agent - 合成状态查询 API
 * GET: 查询视频合成进度和结果
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { videoQueueManager } from '@/lib/queue/queue-manager'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 查询合成状态
 * GET /api/video-agent/projects/[id]/compose/status
 *
 * 返回格式:
 * {
 *   success: true,
 *   data: {
 *     status: 'in_progress' | 'completed' | 'failed',
 *     progress: 85,  // 百分比
 *     finalVideoUrl?: string,
 *     error?: string
 *   }
 * }
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    const nowMs = Date.now()

    // 验证项目所有权并获取状态
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      // Include updated_at so we can detect stuck queued/processing states and avoid infinite spinners.
      .select('user_id, status, step_6_status, final_video_url, final_video_file_size, final_video_resolution, duration, updated_at')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    // 判断合成状态 (Step 6)
    const step6Status = project.step_6_status

    console.log('[Video Agent] Compose status check', {
      projectId,
      step_6_status: step6Status,
      status: project.status
    })

    if (!step6Status || step6Status === 'pending') {
      return NextResponse.json({
        success: true,
        data: {
          status: 'not_started',
          progress: 0,
          message: 'Video composition not started yet'
        }
      })
    }

    if (step6Status === 'queued') {
      // Check if job actually exists in Redis queue
      // If the job is not in the queue, it means it was lost (Redis restart or enqueue failure)
      // and we should fail fast so the user can retry.
      const composeJobId = `va:compose:${projectId}`
      const jobStatus = await videoQueueManager.getJobStatus(composeJobId)

      if (!jobStatus) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Job missing from queue',
            code: 'COMPOSE_JOB_MISSING',
            retryable: true,
            message: 'Job lost from queue. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      // Check for zombie jobs (Redis thinks it's done, DB thinks it's queued)
      if (jobStatus.finishedOn) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Job completed but DB stuck',
            code: 'COMPOSE_JOB_STUCK_COMPLETED',
            retryable: true,
            message: 'Job completed in background but status not updated. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      if (jobStatus.failedReason) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: jobStatus.failedReason,
            code: 'COMPOSE_JOB_FAILED_REDIS',
            retryable: true,
            message: `Job failed: ${jobStatus.failedReason}. Please try again.`,
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      // If job exists but is stuck in queue too long
      const updatedAtMs = project.updated_at ? new Date(project.updated_at).getTime() : NaN
      const ageMs = Number.isFinite(updatedAtMs) ? Math.max(0, nowMs - updatedAtMs) : 0
      const timeoutMs = 3 * 60 * 1000

      if (ageMs > timeoutMs) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Composition queued too long',
            code: 'COMPOSE_STUCK_QUEUED',
            retryable: true,
            message: 'Composition is stuck in queue. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      return NextResponse.json({
        success: true,
        data: {
          status: 'processing',
          progress: 5,
          message: 'Video composition queued...',
          updated_at: project.updated_at,
          step_6_status: step6Status
        }
      })
    }

    if (step6Status === 'processing') {
      // Check Redis status for processing jobs too (detect zombies that died while processing)
      const composeJobId = `va:compose:${projectId}`
      const jobStatus = await videoQueueManager.getJobStatus(composeJobId)

      if (!jobStatus) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Job missing from processing queue',
            code: 'COMPOSE_JOB_MISSING',
            retryable: true,
            message: 'Job lost while processing. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      if (jobStatus.finishedOn) {
        // Attempt to recover the result from Redis return value
        const result = jobStatus.returnvalue

        if (result && result.composed && result.video && result.video.url) {
          console.log('[Video Agent] 🛠️ Auto-recovering completed job from Redis:', { projectId })

          // Update DB with recovered data
          const { error: updateError } = await supabaseAdmin
            .from('video_agent_projects')
            .update({
              status: 'completed',
              step_6_status: 'completed',
              final_video_url: result.video.url,
              final_video_file_size: result.video.fileSize,
              final_video_resolution: result.video.resolution,
              final_video_storage_path: result.video.storageKey || `shotstack:${projectId}`, // Fallback if missing
              completed_at: new Date().toISOString(),
            } as any)
            .eq('id', projectId)

          if (!updateError) {
            return NextResponse.json({
              success: true,
              data: {
                status: 'completed',
                progress: 100,
                finalVideo: {
                  url: result.video.url,
                  file_size: result.video.fileSize || 0,
                  resolution: result.video.resolution || '1080p',
                  duration: result.video.duration || 0
                },
                message: 'Video composition completed (recovered)',
                updated_at: new Date().toISOString(),
                step_6_status: 'completed'
              }
            })
          }
        }

        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Job completed but DB stuck in processing',
            code: 'COMPOSE_JOB_STUCK_COMPLETED',
            retryable: true,
            message: 'Job finished but status not updated. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      if (jobStatus.failedReason) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: jobStatus.failedReason,
            code: 'COMPOSE_JOB_FAILED_REDIS',
            retryable: true,
            message: `Job failed: ${jobStatus.failedReason}. Please try again.`,
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      const updatedAtMs = project.updated_at ? new Date(project.updated_at).getTime() : NaN
      const ageMs = Number.isFinite(updatedAtMs) ? Math.max(0, nowMs - updatedAtMs) : 0

      // If processing makes no observable progress for too long, fail fast with a retryable error.
      // This commonly indicates a stuck worker/job or a lost callback from the render provider.
      const timeoutMs = 10 * 60 * 1000
      if (ageMs > timeoutMs) {
        return NextResponse.json({
          success: true,
          data: {
            status: 'failed',
            progress: 0,
            error: 'Composition processing timeout',
            code: 'COMPOSE_STUCK_PROCESSING',
            retryable: true,
            message: 'Composition appears stuck. Please try again.',
            updated_at: project.updated_at,
            step_6_status: step6Status
          }
        })
      }

      // 合成中 - 返回预估进度
      // 注意: 实际实现中可以通过 FFmpeg 进度回调获取精确进度
      // 这里简单返回一个固定进度值
      return NextResponse.json({
        success: true,
        data: {
          status: 'processing',  // 修复：统一使用 'processing'，与前端期望一致
          progress: 50,  // 可以根据实际情况动态计算
          message: 'Video composition in progress...',
          updated_at: project.updated_at,
          step_6_status: step6Status
        }
      })
    }

    if (step6Status === 'completed') {
      // 合成完成 - 返回符合前端期望的嵌套结构
      return NextResponse.json({
        success: true,
        data: {
          status: 'completed',
          progress: 100,
          finalVideo: {
            url: project.final_video_url,
            file_size: project.final_video_file_size || 0,
            resolution: project.final_video_resolution || '1080p',
            duration: project.duration || 0
          },
          message: 'Video composition completed successfully',
          updated_at: project.updated_at,
          step_6_status: step6Status
        }
      })
    }

    if (step6Status === 'failed') {
      // 合成失败
      console.error('[Video Agent] Composition failed for project', { projectId })
      return NextResponse.json({
        success: true,
        data: {
          status: 'failed',
          progress: 0,
          error: 'Video composition failed',
          message: 'Video composition failed. Please try again.',
          updated_at: project.updated_at,
          step_6_status: step6Status
        }
      })
    }

    // 未知状态
    return NextResponse.json({
      success: true,
      data: {
        status: 'unknown',
        progress: 0,
        message: 'Unknown composition status',
        updated_at: project.updated_at,
        step_6_status: step6Status
      }
    })

  } catch (error) {
    console.error('[Video Agent] Compose status check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check composition status',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})
