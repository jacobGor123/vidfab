/**
 * Video Agent - Projects API
 * 创建和管理 Video Agent 项目
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { checkAndDeductScriptCreation } from '@/lib/video-agent/script-creation-quota'

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
      mute_bgm?: boolean
      image_style_id?: string  // 🔥 新增：图片风格 ID
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
      enable_narration: enableNarration = false,
      mute_bgm: muteBgm = true,
      image_style_id: imageStyleId  // 🔥 新增：接收图片风格 ID
    } = body

    // 🔥 YouTube 视频复刻模式：允许 1-120 秒的任意时长（最多 2 分钟）
    // 文字脚本模式：仍然推荐使用 15/30/45/60，但不强制限制
    // 注意：YouTube Shorts 官方上限是 60 秒，但实际视频可能稍长，因此放宽到 120 秒
    if (!duration || typeof duration !== 'number' || duration < 1 || duration > 120) {
      return NextResponse.json(
        { error: 'Invalid duration. Must be between 1 and 120 seconds' },
        { status: 400 }
      )
    }

    // 🔥 确保 duration 是整数（数据库字段是 integer 类型）
    const intDuration = Math.round(duration)

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

    // ✅ 脚本创建配额检查（新增）
    // 检查月度免费次数配额，超额时扣除3积分
    const quotaCheck = await checkAndDeductScriptCreation(userId)

    if (!quotaCheck.canAfford) {
      console.log('[Video Agent] Script creation quota check failed:', quotaCheck)
      return NextResponse.json(
        {
          error: quotaCheck.error || 'Script creation quota exceeded',
          code: 'INSUFFICIENT_CREDITS',
          details: quotaCheck.details
        },
        { status: 402 }
      )
    }

    console.log('[Video Agent] Script creation quota check passed:', {
      withinQuota: quotaCheck.withinQuota,
      currentUsage: quotaCheck.currentUsage,
      monthlyQuota: quotaCheck.monthlyQuota,
      creditsDeducted: quotaCheck.creditsDeducted
    })

    console.log('[Video Agent] Creating new project', {
      userId,
      duration: intDuration,  // 🔥 使用整数
      originalDuration: duration,  // 记录原始值用于日志
      storyStyle,
      scriptLength: originalScript.length,
      aspectRatio,
      enableNarration,
      muteBgm,
      imageStyleId  // 🔥 记录图片风格
    })

    // 创建项目
    const { data, error } = await supabaseAdmin
      .from('video_agent_projects')
      .insert({
        user_id: userId,
        duration: intDuration,  // 🔥 使用四舍五入后的整数
        story_style: storyStyle,
        original_script: originalScript,
        aspect_ratio: aspectRatio,
        enable_narration: enableNarration,
        mute_bgm: muteBgm,
        image_style_id: imageStyleId,  // 🔥 保存图片风格 ID
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
      enableNarration: data.enable_narration,
      muteBgm: data.mute_bgm
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
