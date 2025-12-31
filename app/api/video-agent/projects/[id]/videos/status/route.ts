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
              const { error: updateError } = await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',
                  video_url: statusResult.videoUrl,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              if (updateError) {
                console.error(`[Video Status API] Failed to update clip ${clip.shot_number}:`, updateError)
              } else {
                console.log(`[Video Status API] Successfully updated clip ${clip.shot_number} to success`)
              }

              return {
                ...clip,
                status: 'success',
                video_url: statusResult.videoUrl
              }
            } else if (statusResult.status === 'failed') {
              // 更新为失败状态
              const errorMessage = statusResult.error || 'Veo3 video generation failed'

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              return {
                ...clip,
                status: 'failed',
                error_message: errorMessage
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
            const statusResult = await checkVideoStatus(clip.seedance_task_id)

            if (statusResult.data.status === 'completed') {
              // 更新数据库
              const videoUrl = statusResult.data.outputs?.[0] || null

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',  // 修复：使用 'success' 而不是 'completed'
                  video_url: videoUrl,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              return {
                ...clip,
                status: 'success',  // 修复：使用 'success' 而不是 'completed'
                video_url: videoUrl
              }
            } else if (statusResult.data.status === 'failed') {
              // 更新为失败状态
              const errorMessage = statusResult.data.error || 'Video generation failed'

              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'failed',
                  error_message: errorMessage,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)

              return {
                ...clip,
                status: 'failed',
                error_message: errorMessage
              }
            }
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
    return NextResponse.json({
      success: true,
      data: clipsWithUpdatedStatus
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
