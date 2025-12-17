/**
 * Video Agent - 项目详情和删除 API
 * GET: 获取项目完整信息
 * DELETE: 删除项目及所有关联数据
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 获取项目详情
 * GET /api/video-agent/projects/[id]
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

    // 获取项目基本信息
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found:', projectError)
      return NextResponse.json(
        { error: 'Project not found', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 获取分镜脚本
    const { data: shots } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    // 获取人物配置
    const { data: characters } = await supabaseAdmin
      .from('project_characters')
      .select(`
        *,
        character_reference_images (*)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    // 获取分镜图
    const { data: storyboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    // 获取视频片段
    const { data: videoClips } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })

    console.log('[Video Agent] Project fetched successfully', {
      projectId,
      shotsCount: shots?.length || 0,
      charactersCount: characters?.length || 0,
      storyboardsCount: storyboards?.length || 0,
      videoClipsCount: videoClips?.length || 0
    })

    return NextResponse.json({
      success: true,
      data: {
        ...project,
        shots: shots || [],
        characters: characters || [],
        storyboards: storyboards || [],
        videoClips: videoClips || []
      }
    })

  } catch (error) {
    console.error('[Video Agent] Get project error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}

/**
 * 删除项目
 * DELETE /api/video-agent/projects/[id]
 */
export async function DELETE(
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

    console.log('[Video Agent] Deleting project', { projectId })

    // 删除关联数据 (使用 CASCADE 自动删除)
    // 1. project_shots (ON DELETE CASCADE)
    // 2. shot_characters (ON DELETE CASCADE)
    // 3. project_characters -> character_reference_images (ON DELETE CASCADE)
    // 4. project_storyboards (ON DELETE CASCADE)
    // 5. project_video_clips (ON DELETE CASCADE)

    // 删除主表记录,级联删除所有关联数据
    const { error: deleteError } = await supabaseAdmin
      .from('video_agent_projects')
      .delete()
      .eq('id', projectId)

    if (deleteError) {
      console.error('[Video Agent] Failed to delete project:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete project', details: deleteError.message },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Project deleted successfully', { projectId })

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    })

  } catch (error) {
    console.error('[Video Agent] Delete project error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}
