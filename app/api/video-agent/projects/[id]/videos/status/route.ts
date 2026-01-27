/**
 * Video Agent - 视频生成状态查询 API
 * GET: 查询所有视频片段的生成状态
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { checkVideoStatus as getBytePlusVideoStatus } from '@/lib/services/byteplus/video/seedance-api'
import { getVideoStatus as getVeo3VideoStatus } from '@/lib/services/video-agent/veo3-video-generator'
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

    // 🔥 关键修复：主动查询BytePlus/Veo3获取generating状态的视频
    const generatingClips = videoClips.filter(clip => clip.status === 'generating')

    if (generatingClips.length > 0) {

      await Promise.allSettled(
        generatingClips.map(async (clip) => {
          try {
            let result: any = null

            // 根据task_id类型判断使用哪个API
            if (clip.seedance_task_id) {
              // BytePlus Seedance
              const byteplusResponse = await getBytePlusVideoStatus(clip.seedance_task_id)

              // 映射 BytePlus 响应格式到统一格式
              result = {
                status: byteplusResponse.data.status === 'completed' ? 'success' : byteplusResponse.data.status === 'failed' ? 'failed' : 'generating',
                videoUrl: byteplusResponse.data.outputs?.[0] || null,
                lastFrameUrl: byteplusResponse.data.lastFrameUrl || null,
                error: byteplusResponse.data.error
              }
            } else if (clip.video_request_id) {
              // Google Veo3
              result = await getVeo3VideoStatus(clip.video_request_id)
            } else {
              return
            }

            if (result.status === 'success' && result.videoUrl) {
              // 更新为成功
              await supabaseAdmin
                .from('project_video_clips')
                .update({
                  status: 'success',
                  video_url: result.videoUrl,
                  video_url_external: result.videoUrl,
                  last_frame_url: result.lastFrameUrl || null,
                  updated_at: new Date().toISOString()
                } as any)
                .eq('id', clip.id)
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
