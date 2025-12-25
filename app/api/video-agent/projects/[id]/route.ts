/**
 * Video Agent - 项目更新和删除 API
 * PATCH /api/video-agent/projects/[id] - 更新项目
 * DELETE /api/video-agent/projects/[id] - 删除项目
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 更新项目
 * PATCH /api/video-agent/projects/[id]
 */
export const PATCH = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found or access denied:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 解析请求体
    const updates = await request.json()

    // 只允许更新特定字段
    const allowedFields = [
      'script_analysis',
      'story_style',
      'duration',
      'aspect_ratio',
      'enable_narration'
    ]

    const filteredUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Updating project:', {
      projectId,
      fields: Object.keys(filteredUpdates)
    })

    // 更新数据库
    const { data, error } = await supabaseAdmin
      .from('video_agent_projects')
      .update(filteredUpdates as any)
      .eq('id', projectId)
      .select()
      .single<VideoAgentProject>()

    if (error) {
      console.error('[Video Agent] Update failed:', error)
      return NextResponse.json(
        { error: 'Failed to update project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })
  } catch (error) {
    console.error('[Video Agent] PATCH /projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * 删除项目
 * DELETE /api/video-agent/projects/[id]
 */
export const DELETE = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found or access denied:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    console.log('[Video Agent] Deleting project:', { projectId })

    // 删除数据库记录
    const { error } = await supabaseAdmin
      .from('video_agent_projects')
      .delete()
      .eq('id', projectId)

    if (error) {
      console.error('[Video Agent] Delete failed:', error)
      return NextResponse.json(
        { error: 'Failed to delete project' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })
  } catch (error) {
    console.error('[Video Agent] DELETE /projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
