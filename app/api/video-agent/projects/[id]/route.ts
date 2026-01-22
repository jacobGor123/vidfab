/**
 * Video Agent - 项目获取、更新和删除 API
 * GET /api/video-agent/projects/[id] - 获取项目详情
 * PATCH /api/video-agent/projects/[id] - 更新项目
 * DELETE /api/video-agent/projects/[id] - 删除项目
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 获取项目详情
 * GET /api/video-agent/projects/[id]
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 查询项目
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
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

    // 🔥 查询 storyboards
    const { data: storyboards, error: storyboardsError } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    if (storyboardsError) {
      console.error('[Video Agent] Failed to fetch storyboards:', storyboardsError)
    }

    // 🔥 查询 characters（关联查询 character_reference_images）
    const { data: characters, error: charactersError } = await supabaseAdmin
      .from('project_characters')
      .select(`
        *,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    if (charactersError) {
      console.error('[Video Agent] Failed to fetch characters:', charactersError)
    }

    // 🔥 查询 video_clips
    const { data: videoClips, error: videoClipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    if (videoClipsError) {
      console.error('[Video Agent] Failed to fetch video clips:', videoClipsError)
    }

    // Normalize storyboard image URL for frontend rendering:
    // prefer CDN/public URL (cdn_url -> image_url_external -> image_url).
    const normalizedStoryboards = (storyboards || []).map((sb: any) => ({
      ...sb,
      image_url: sb.cdn_url || sb.image_url_external || sb.image_url
    }))

    // 🔥 组合返回数据
    const projectWithRelations = {
      ...project,
      storyboards: normalizedStoryboards,
      characters: characters || [],
      video_clips: videoClips || []
    }

    return NextResponse.json({
      success: true,
      data: projectWithRelations
    })
  } catch (error) {
    console.error('[Video Agent] GET /projects/[id] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})

/**
 * 更新项目
 * PATCH /api/video-agent/projects/[id]
 */
export const PATCH = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 🔥 在最开始就记录请求
    console.log('[Video Agent] PATCH /projects/[id] called:', {
      projectId,
      userId
    })

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

    // 🔥 记录收到的原始 updates
    console.log('[Video Agent] Received updates:', {
      fields: Object.keys(updates),
      hasScriptAnalysis: !!updates.script_analysis,
      scriptAnalysisType: typeof updates.script_analysis,
      scriptAnalysisKeys: updates.script_analysis ? Object.keys(updates.script_analysis) : null,
      hasShotsInAnalysis: updates.script_analysis?.shots ? true : false,
      shotsCount: Array.isArray(updates.script_analysis?.shots) ? updates.script_analysis.shots.length : 'N/A'
    })

    // 只允许更新特定字段
    const allowedFields = [
      'script_analysis',
      'story_style',
      'duration',
      'aspect_ratio',
      'enable_narration',
      'step_1_status'  // 🔥 YouTube 模式需要直接设置步骤状态
    ]

    const filteredUpdates: Record<string, any> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    // 🔥 记录过滤后的字段
    console.log('[Video Agent] Filtered updates:', {
      projectId,
      fields: Object.keys(filteredUpdates),
      hasScriptAnalysis: !!filteredUpdates.script_analysis,
      scriptAnalysisType: typeof filteredUpdates.script_analysis
    })

    if (Object.keys(filteredUpdates).length === 0) {
      console.error('[Video Agent] No valid fields to update')
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      )
    }

    // 🔥 如果更新了 script_analysis，同时保存 shots 到 project_shots 表
    // 这对 YouTube 模式非常重要，因为它跳过了 analyze-script API
    if (filteredUpdates.script_analysis && typeof filteredUpdates.script_analysis === 'object') {
      const analysis = filteredUpdates.script_analysis as any

      console.log('[Video Agent] Processing script_analysis:', {
        hasShots: !!analysis.shots,
        shotsIsArray: Array.isArray(analysis.shots),
        shotsLength: analysis.shots?.length || 0,
        // 🔥 记录第一个 shot 的结构，用于调试
        firstShotSample: analysis.shots?.[0] ? {
          shot_number: analysis.shots[0].shot_number,
          hasDescription: !!analysis.shots[0].description,
          hasDuration: !!analysis.shots[0].duration_seconds
        } : null
      })

      if (analysis.shots && Array.isArray(analysis.shots)) {
        console.log('[Video Agent] ✅ Shots array is valid, preparing to insert', analysis.shots.length, 'shots')

        const shotsToInsert = analysis.shots.map((shot: any) => ({
          project_id: projectId,
          shot_number: shot.shot_number,
          time_range: shot.time_range,
          description: shot.description,
          camera_angle: shot.camera_angle,
          character_action: shot.character_action,
          mood: shot.mood,
          duration_seconds: Math.max(2, Math.round(shot.duration_seconds))  // 🔥 最小2秒
        }))

        // 🔥 记录第一个将要插入的 shot
        console.log('[Video Agent] First shot to insert:', shotsToInsert[0])

        const { error: shotsError } = await supabaseAdmin
          .from('project_shots')
          .upsert(shotsToInsert as any, {
            onConflict: 'project_id,shot_number'
          })

        if (shotsError) {
          console.error('[Video Agent] Failed to save shots:', shotsError)
          // 不返回错误，因为主要数据已经保存在 script_analysis 字段中
        } else {
          console.log('[Video Agent] Saved', shotsToInsert.length, 'shots to project_shots table')
        }
      }
    }

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
