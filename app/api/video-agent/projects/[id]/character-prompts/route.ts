/**
 * Video Agent - 生成人物 Prompts API
 * POST /api/video-agent/projects/[id]/character-prompts
 *
 * 根据脚本分析结果自动生成每个人物的生图 prompt
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { generateCharacterPrompts, ImageStyle } from '@/lib/services/video-agent/character-prompt-generator'
import type { Database } from '@/lib/database.types'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

export const runtime = 'nodejs'
export const maxDuration = 60

/**
 * POST /api/video-agent/projects/[id]/character-prompts
 * 生成人物 Prompts
 */
export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      )
    }

    // 3. 检查脚本分析结果
    if (!project.script_analysis) {
      return NextResponse.json(
        { error: 'Script analysis not found. Please analyze script first.' },
        { status: 400 }
      )
    }

    // 4. 解析请求参数
    const body = await request.json()
    const { imageStyle = 'realistic' } = body

    // 验证 imageStyle
    const validStyles = ['realistic', 'anime', 'fantasy', 'cyberpunk', 'oil-painting', '3d-render', 'watercolor', 'comic-book']
    if (!validStyles.includes(imageStyle)) {
      return NextResponse.json(
        { error: `Invalid image style. Must be one of: ${validStyles.join(', ')}` },
        { status: 400 }
      )
    }

    console.log('[API] Generating character prompts:', {
      projectId,
      imageStyle,
      characters: (project.script_analysis as unknown as ScriptAnalysisResult).characters
    })

    // 5. 调用 Gemini 生成 prompts
    const characterPrompts = await generateCharacterPrompts(
      project.script_analysis as unknown as ScriptAnalysisResult,
      imageStyle as ImageStyle
    )

    console.log('[API] Character prompts generated:', {
      count: characterPrompts.length
    })

    return NextResponse.json({
      success: true,
      data: {
        characterPrompts,
        imageStyle
      }
    })

  } catch (error: any) {
    console.error('[API] Character prompts generation failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate character prompts',
        details: error.message
      },
      { status: 500 }
    )
  }
})
