/**
 * Video Agent - 视频生成状态查询 API
 * GET: 查询所有视频片段的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import type { Database } from '@/lib/database.types'
import pLimit from 'p-limit'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

/**
 * 触发视频片段下载到 Supabase Storage
 * 策略：优先使用队列系统（可靠），降级为直接下载（快速）
 */
async function triggerVideoClipDownload(
  projectId: string,
  shotNumber: number,
  externalUrl: string
): Promise<void> {
  try {
    // 🔥 策略 1：尝试使用队列系统（推荐，但需要 Redis 可用）
    try {
      const { videoQueueManager } = await import('@/lib/queue/queue-manager')

      // 获取项目信息以获取 userId
      const { data: project } = await supabaseAdmin
        .from('video_agent_projects')
        .select('user_id')
        .eq('id', projectId)
        .single()

      if (!project) {
        throw new Error('Project not found')
      }

      await videoQueueManager.addJob(
        'video_clip_download',
        {
          jobId: `video_clip_download_${projectId}_${shotNumber}`,
          userId: project.user_id,
          videoId: projectId,
          projectId,
          shotNumber,
          externalUrl,
          createdAt: new Date().toISOString()
        },
        {
          priority: 'normal',
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 }
        }
      )

      console.log(`[Download Trigger] Queued video clip download for shot ${shotNumber}`)
      return
    } catch (queueError) {
      console.warn(`[Download Trigger] Queue unavailable, falling back to direct download:`, queueError)
    }

    // 🔥 策略 2：降级为直接下载（不依赖 Redis）
    const { VideoAgentStorageManager } = await import('@/lib/services/video-agent/storage-manager')

    // 获取项目信息
    const { data: project } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (!project) {
      throw new Error('Project not found')
    }

    // 后台异步下载（不阻塞）
    VideoAgentStorageManager.downloadAndStoreVideoClip(
      project.user_id,
      projectId,
      shotNumber,
      externalUrl
    ).then(() => {
      console.log(`[Download Trigger] Direct download completed for video clip shot ${shotNumber}`)
    }).catch(err => {
      console.error(`[Download Trigger] Direct download failed for video clip shot ${shotNumber}:`, err)
    })

  } catch (error) {
    console.error(`[Download Trigger] Failed to trigger video clip download for shot ${shotNumber}:`, error)
    throw error
  }
}

/**
 * 查询视频生成状态
 * GET /api/video-agent/projects/[id]/videos/status
 *
 * 返回格式:
 * {
 *   success: true,
 *   data: {
 *     totalClips: 6,
 *     completed: 4,
 *     generating: 1,
 *     failed: 1,
 *     clips: [...]
 *   }
 * }
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id')
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

    // 获取所有视频片段
    const { data: videoClips, error: clipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })
      .returns<ProjectVideoClip[]>()

    if (clipsError) {
      console.error('[Video Agent] Failed to fetch video clips:', clipsError)
      return NextResponse.json(
        { error: 'Failed to fetch video clips' },
        { status: 500 }
      )
    }

    if (!videoClips || videoClips.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // 统计正在生成中的视频数量
    const generatingClips = videoClips.filter(c => c.status === 'generating' && (c.seedance_task_id || c.video_request_id))
    const stuckGeneratingClips = videoClips.filter(c => c.status === 'generating' && !c.seedance_task_id && !c.video_request_id)

    // ✅ 优化：限制并发查询外部服务（避免触发速率限制）
    const limit = pLimit(3)

    const clipsWithUpdatedStatus = await Promise.all(
      videoClips.map((clip) => limit(async () => {
        // 如果状态是 generating 且有 video_request_id（Veo3），查询 Veo3 状态
        if (clip.status === 'generating' && clip.video_request_id) {
          try {
            console.log(`[Video Status API] Checking Veo3 status for shot ${clip.shot_number}:`, {
              clipId: clip.id,
              requestId: clip.video_request_id
            })

            const { getVeo3VideoStatus } = await import('@/lib/services/video-agent/veo3-video-generator')
            const statusResult = await getVeo3VideoStatus(clip.video_request_id)

            console.log(`[Video Status API] Veo3 status result for shot ${clip.shot_number}:`, {
              status: statusResult.status,
              hasVideoUrl: !!statusResult.videoUrl,
              videoUrl: statusResult.videoUrl,
              error: statusResult.error
            })

            if (statusResult.status === 'completed' && statusResult.videoUrl) {
              console.log(`[Video Status API] Updating clip ${clip.shot_number} to success with URL:`, statusResult.videoUrl)

              // 更新数据库
              const now = new Date().toISOString()
              const { error: updateError } = await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',
                  video_url: statusResult.videoUrl,
                  video_url_external: statusResult.videoUrl, // 保存外部 URL
                  storage_status: 'pending', // 标记为待下载
                  updated_at: now
                } as any)
                .eq('id', clip.id)

              if (updateError) {
                console.error(`[Video Status API] Failed to update clip ${clip.shot_number}:`, updateError)
              } else {
                console.log(`[Video Status API] Successfully updated clip ${clip.shot_number} to success`)

                // 🔥 触发下载到 Supabase Storage（后台异步）
                triggerVideoClipDownload(projectId, clip.shot_number, statusResult.videoUrl)
                  .catch(err => {
                    console.error(`[Video Status API] Failed to trigger download for clip ${clip.shot_number}:`, err)
                  })
              }

              // 🔥 修复：返回正确的 updated_at
              return {
                ...clip,
                status: 'success',
                video_url: statusResult.videoUrl,
                updated_at: now
              }
            } else if (statusResult.status === 'failed') {
              // 更新为失败状态
              const errorMessage = statusResult.error || 'Veo3 video generation failed'
              const now = new Date().toISOString()

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  updated_at: now
                } as any)
                .eq('id', clip.id)

              // 🔥 修复：返回正确的 updated_at
              return {
                ...clip,
                status: 'failed',
                error_message: errorMessage,
                updated_at: now
              }
            }
          } catch (error) {
            console.error(`[Video Agent] Failed to check Veo3 status for clip ${clip.shot_number}:`, error)
            // 保持原状态
          }
        }
        // 如果状态是 generating 且有 seedance_task_id (BytePlus),查询 BytePlus 状态
        else if (clip.status === 'generating' && clip.seedance_task_id) {
          try {
            console.log(`[Video Status API] Checking BytePlus status for shot ${clip.shot_number}:`, {
              taskId: clip.seedance_task_id
            })

            const statusResult = await checkVideoStatus(clip.seedance_task_id)

            console.log(`[Video Status API] BytePlus status result for shot ${clip.shot_number}:`, {
              status: statusResult.data.status,
              hasOutputs: !!statusResult.data.outputs?.length,
              error: statusResult.data.error
            })

            if (statusResult.data.status === 'completed') {
              // 更新数据库
              const videoUrl = statusResult.data.outputs?.[0] || null
              const now = new Date().toISOString()

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',  // 修复：使用 'success' 而不是 'completed'
                  video_url: videoUrl,
                  video_url_external: videoUrl, // 保存外部 URL
                  storage_status: 'pending', // 标记为待下载
                  updated_at: now
                } as any)
                .eq('id', clip.id)

              // 🔥 触发下载到 Supabase Storage（后台异步）
              if (videoUrl) {
                triggerVideoClipDownload(projectId, clip.shot_number, videoUrl)
                  .catch(err => {
                    console.error(`[Video Status API] Failed to trigger download for clip ${clip.shot_number}:`, err)
                  })
              }

              // 🔥 修复：返回正确的 updated_at
              return {
                ...clip,
                status: 'success',  // 修复：使用 'success' 而不是 'completed'
                video_url: videoUrl,
                updated_at: now
              }
            } else if (statusResult.data.status === 'failed') {
              // 更新为失败状态
              const errorMessage = statusResult.data.error || 'Video generation failed'
              const now = new Date().toISOString()

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  updated_at: now
                } as any)
                .eq('id', clip.id)

              // 🔥 修复：返回正确的 updated_at
              return {
                ...clip,
                status: 'failed',
                error_message: errorMessage,
                updated_at: now
              }
            }
            // status 仍为 'generating'，继续轮询
          } catch (error) {
            console.error(`[Video Agent] Failed to check status for clip ${clip.shot_number}:`, error)
            // 保持原状态
          }
        }

        return clip
      }))
    )

    // 统计状态
    const successCount = clipsWithUpdatedStatus.filter(c => c.status === 'success').length
    const generating = clipsWithUpdatedStatus.filter(c => c.status === 'generating').length
    const failed = clipsWithUpdatedStatus.filter(c => c.status === 'failed').length

    // 检查是否全部完成
    if (successCount + failed === clipsWithUpdatedStatus.length && generating === 0) {
      // 更新项目状态
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_4_status: 'completed'  // Step 4（视频生成）完成
          // 不更新 current_step，由前端在用户点击"继续"时更新
        } as any)
        .eq('id', projectId)
    }

    // 直接返回数组（匹配前端期望）
    // 🔥 优先使用 CDN URL (cdn_url → video_url_external → video_url)
    return NextResponse.json({
      success: true,
      data: clipsWithUpdatedStatus.map(clip => ({
        ...clip,
        video_url: clip.cdn_url || clip.video_url_external || clip.video_url  // 优先使用 CDN URL
      }))
    })

  } catch (error) {
    console.error('[Video Agent] Video status check error:', error)
    return NextResponse.json(
      {
        error: 'Failed to check video status',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})
