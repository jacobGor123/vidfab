/**
 * Video Agent - 视频生成状态查询 API
 * GET: 查询所有视频片段的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { checkVideoStatus as getBytePlusVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import { videoQueueManager } from '@/lib/queue/queue-manager'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

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
    let { data: videoClips, error: clipsError } = await supabaseAdmin
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

    // 🔥 关键修复：主动查询BytePlus获取generating状态的视频
    const generatingClips = videoClips.filter(clip => clip.status === 'generating')

    if (generatingClips.length > 0) {
      // 🔥 添加超时保护：每个外部API调用最多30秒
      const EXTERNAL_API_TIMEOUT_MS = 30000

      const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
        return Promise.race([
          promise,
          new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error('External API timeout')), timeoutMs)
          )
        ])
      }

      await Promise.allSettled(
        generatingClips.map(async (clip) => {
          try {
            let result: any = null

            // BytePlus Seedance
            if (clip.seedance_task_id) {
              const byteplusResponse = await withTimeout(
                getBytePlusVideoStatus(clip.seedance_task_id),
                EXTERNAL_API_TIMEOUT_MS
              )

              // 映射 BytePlus 响应格式到统一格式
              result = {
                status: byteplusResponse.data.status === 'completed' ? 'success' : byteplusResponse.data.status === 'failed' ? 'failed' : 'generating',
                videoUrl: byteplusResponse.data.outputs?.[0] || null,
                lastFrameUrl: byteplusResponse.data.lastFrameUrl || null,
                error: byteplusResponse.data.error
              }
            } else {
              return
            }

            if (result.status === 'success' && result.videoUrl) {
              // 更新为成功，同时标记待下载
              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',
                  video_url: result.videoUrl,
                  video_url_external: result.videoUrl,
                  last_frame_url: result.lastFrameUrl || null,
                  storage_status: 'pending',
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              // 入队下载任务，将片段永久存入 Supabase Storage
              // jobId 包含 taskId 后缀，保证幂等：同一视频任务不会重复入队
              try {
                const now = new Date().toISOString()
                const taskSuffix = clip.seedance_task_id ? `:${clip.seedance_task_id}` : ''
                await videoQueueManager.addJob(
                  'video_clip_download',
                  {
                    type: 'video_clip_download',
                    jobId: `va:clip:download:${projectId}:${clip.shot_number}${taskSuffix}`,
                    userId,
                    videoId: projectId,
                    projectId,
                    shotNumber: clip.shot_number,
                    externalUrl: result.videoUrl,
                    createdAt: now,
                  } as any,
                  {
                    priority: 'normal',
                    attempts: 6,
                    backoff: { type: 'exponential', delay: 10000 },
                  }
                )
              } catch (queueErr) {
                // 入队失败不阻断状态响应，片段 video_url 已保存，只是暂未上传到 Supabase
                console.error(`[Video Agent] Failed to enqueue clip download for shot ${clip.shot_number}:`, queueErr)
              }
            } else if (result.status === 'failed') {
              // 更新为失败
              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'failed',
                  error_message: result.error || 'Video generation failed',
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              console.error(`[Video Agent] Video clip ${clip.shot_number} generation failed:`, result.error)
            }
            // 如果still generating，不更新状态
          } catch (error) {
            console.error(`[Video Agent] Error polling video clip ${clip.shot_number}:`, error)
          }
        })
      )

      // 重新查询更新后的数据
      const { data: updatedClips } = await supabaseAdmin
        .from('project_video_clips')
        .select('*')
        .eq('project_id', projectId)
        .order('shot_number', { ascending: true })
        .returns<ProjectVideoClip[]>()

      if (updatedClips) {
        videoClips = updatedClips
      }
    }

    // 🔥 检查所有视频是否已完成，如果是则更新 project 的 step_4_status
    const generatingCount = videoClips.filter(clip => clip.status === 'generating').length

    // 如果所有视频都已完成（成功或失败），更新项目状态
    if (generatingCount === 0 && videoClips.length > 0) {
      await supabaseAdmin
        .from('video_agent_projects')
        .update({
          step_4_status: 'completed',
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', projectId)
    }

    // 直接返回数组（匹配前端期望）
    // 🔥 优先使用 CDN URL (cdn_url → video_url_external → video_url)
    return NextResponse.json({
      success: true,
      data: videoClips.map(clip => ({
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
