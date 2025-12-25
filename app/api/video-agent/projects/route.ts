/**
 * Video Agent - Projects API
 * 创建和管理 Video Agent 项目
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin, TABLES } from '@/lib/supabase'

/**
 * 创建新项目
 * POST /api/video-agent/projects
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {

    // 解析请求体
    let body: {
      duration: number
      story_style: string
      original_script: string
      aspect_ratio?: '16:9' | '9:16'
      enable_narration?: boolean
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    // 验证参数
    const {
      duration,
      story_style: storyStyle,
      original_script: originalScript,
      aspect_ratio: aspectRatio = '16:9',
      enable_narration: enableNarration = false
    } = body

    if (!duration || ![15, 30, 45, 60].includes(duration)) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be 15, 30, 45, or 60 seconds' },
        { status: 400 }
      )
    }

    const validStyles = ['auto', 'comedy', 'mystery', 'moral', 'twist', 'suspense', 'warmth', 'inspiration']
    if (!storyStyle || !validStyles.includes(storyStyle)) {
      return NextResponse.json(
        { error: `Invalid story style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    if (!originalScript || originalScript.trim() === '') {
      return NextResponse.json(
        { error: 'Script is required' },
        { status: 400 }
      )
    }

    // 验证 aspect_ratio
    if (aspectRatio && !['16:9', '9:16'].includes(aspectRatio)) {
      return NextResponse.json(
        { error: 'Invalid aspect ratio. Must be 16:9 or 9:16' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Creating new project', {
      userId,
      duration,
      storyStyle,
      scriptLength: originalScript.length,
      aspectRatio,
      enableNarration
    })

    // 创建项目
    const { data, error } = await supabaseAdmin
      .from('video_agent_projects')
      .insert({
        user_id: userId,
        duration,
        story_style: storyStyle,
        original_script: originalScript,
        aspect_ratio: aspectRatio,
        enable_narration: enableNarration,
        status: 'draft',
        current_step: 1
      })
      .select()
      .single()

    if (error) {
      console.error('[Video Agent] Failed to create project:', error)
      return NextResponse.json(
        { error: 'Failed to create project', details: error.message },
        { status: 500 }
      )
    }

    console.log('[Video Agent] Project created successfully', {
      projectId: data.id,
      aspectRatio: data.aspect_ratio,
      enableNarration: data.enable_narration
    })

    return NextResponse.json({
      success: true,
      data: data  // 返回完整的项目数据，包含 aspect_ratio 和 enable_narration
    })

  } catch (error) {
    console.error('[Video Agent] Create project error:', error)
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
})

/**
 * 获取用户的所有项目
 * GET /api/video-agent/projects
 */
export const GET = withAuth(async (request, { params, userId }) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Video Agent] Failed to fetch projects:', error)
      return NextResponse.json(
        { error: 'Failed to fetch projects' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: data || []
    })

  } catch (error) {
    console.error('[Video Agent] Get projects error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
