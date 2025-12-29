/**
 * Video Agent - 保存合成视频到 My Assets
 * POST: 将最终合成的视频保存到用户的 my-assets
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { UserVideosDB } from '@/lib/database/user-videos'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 保存合成视频到 My Assets
 * POST /api/video-agent/projects/[id]/save-to-assets
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id
    console.log('[Video Agent] 💾 Save to Assets API called', { projectId, userId })

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] ❌ Project not found', { projectError })
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查是否已完成合成
    if (!project.final_video_url || project.step_6_status !== 'completed') {
      console.error('[Video Agent] Video not ready', {
        hasFinalVideo: !!project.final_video_url,
        step_6_status: project.step_6_status
      })
      return NextResponse.json(
        { error: 'Video composition must be completed first', code: 'VIDEO_NOT_READY' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] 📹 Saving video to my-assets...', {
      finalVideoUrl: project.final_video_url,
      aspectRatio: project.aspect_ratio,
      duration: project.duration
    })

    // 构建 prompt（使用用户输入 + 主题）
    let prompt = project.script_analysis?.user_input || 'Video Agent Generated Video'
    if (project.script_analysis?.theme) {
      prompt = `${project.script_analysis.theme}: ${prompt}`
    }

    // 创建视频记录
    const video = await UserVideosDB.createVideo(
      userId,
      {
        wavespeedRequestId: `video-agent-${projectId}`, // 使用项目 ID 作为唯一标识
        prompt: prompt.substring(0, 500), // 限制长度
        settings: {
          model: 'video-agent',
          duration: `${project.duration || 30}s`,
          resolution: '1080p',
          aspectRatio: project.aspect_ratio || '16:9',
          style: project.image_style_id || 'realistic'
        },
        originalUrl: project.final_video_url,
        storagePath: project.final_video_storage_path || undefined
      },
      undefined // userEmail 可选
    )

    // 更新视频状态为已完成（因为是已经生成好的视频）
    await UserVideosDB.updateVideoStatus(video.id, {
      status: 'completed',
      downloadProgress: 100,
      durationSeconds: project.duration || undefined,
      originalUrl: project.final_video_url
    })

    console.log('[Video Agent] ✅ Video saved to my-assets', {
      videoId: video.id,
      prompt: prompt.substring(0, 100)
    })

    return NextResponse.json({
      success: true,
      data: {
        videoId: video.id,
        message: 'Video saved to My Assets successfully'
      }
    })

  } catch (error) {
    console.error('[Video Agent] ❌ Save to assets error:', {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to save video to assets',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        code: 'SAVE_FAILED'
      },
      { status: 500 }
    )
  }
})
