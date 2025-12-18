/**
 * Video Agent - 视频生成状态查询 API
 * GET: 查询所有视频片段的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { checkVideoStatus } from '@/lib/services/byteplus/video/seedance-api'

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
export async function GET(
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
      .select('user_id')
      .eq('id', projectId)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== session.user.uuid) {
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

    console.log('[Video Agent] Status check:', {
      projectId,
      totalClips: videoClips.length,
      generatingCount: generatingClips.length,
      stuckCount: stuckGeneratingClips.length,
      generatingShots: generatingClips.map(c => ({
        shot: c.shot_number,
        seedanceId: c.seedance_task_id,
        veo3Id: c.video_request_id
      })),
      stuckShots: stuckGeneratingClips.map(c => ({
        shot: c.shot_number,
        hasTaskId: false,
        status: c.status
      }))
    })

    // 查询正在生成中的视频状态
    const clipsWithUpdatedStatus = await Promise.all(
      videoClips.map(async (clip) => {
        // 如果状态是 generating 且有 video_request_id（Veo3），查询 Veo3 状态
        if (clip.status === 'generating' && clip.video_request_id) {
          try {
            const { getVeo3VideoStatus } = await import('@/lib/services/video-agent/veo3-video-generator')
            const statusResult = await getVeo3VideoStatus(clip.video_request_id)

            if (statusResult.status === 'completed' && statusResult.videoUrl) {
              // 更新数据库
              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',
                  video_url: statusResult.videoUrl,
                  updated_at: new Date().toISOString()
                })
                .eq('id', clip.id)

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
                })
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
                })
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
                })
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
      })
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
        })
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
}
