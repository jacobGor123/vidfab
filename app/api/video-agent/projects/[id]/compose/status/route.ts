/**
 * Video Agent - 合成状态查询 API
 * GET: 查询视频合成进度和结果
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
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

    // 验证项目所有权并获取状态
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('user_id, status, step_6_status, final_video_url, final_video_file_size, final_video_resolution, duration')
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

    if (step6Status === 'processing') {
      // 合成中 - 返回预估进度
      // 注意: 实际实现中可以通过 FFmpeg 进度回调获取精确进度
      // 这里简单返回一个固定进度值
      return NextResponse.json({
        success: true,
        data: {
          status: 'processing',  // 修复：统一使用 'processing'，与前端期望一致
          progress: 50,  // 可以根据实际情况动态计算
          message: 'Video composition in progress...'
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
          message: 'Video composition completed successfully'
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
          message: 'Video composition failed. Please try again.'
        }
      })
    }

    // 未知状态
    return NextResponse.json({
      success: true,
      data: {
        status: 'unknown',
        progress: 0,
        message: 'Unknown composition status'
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
