/**
 * Video Agent - 人物配置 API
 * 配置项目中的人物角色和参考图
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * 配置人物角色
 * POST /api/video-agent/projects/[id]/characters
 */
export async function POST(
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
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 解析请求体
    let body: {
      characters: Array<{
        name: string
        source: 'template' | 'upload' | 'ai_generate'
        templateId?: string
        referenceImages?: string[]
        generationPrompt?: string
      }>
    }

    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      )
    }

    if (!body.characters || !Array.isArray(body.characters)) {
      return NextResponse.json(
        { error: 'Characters array is required' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Configuring characters for project', {
      projectId,
      characterCount: body.characters.length
    })

    // 删除现有的人物配置 (如果有)
    await supabaseAdmin
      .from('project_characters')
      .delete()
      .eq('project_id', projectId)

    // 插入新的人物配置
    const charactersToInsert = body.characters.map(char => ({
      project_id: projectId,
      character_name: char.name,
      source: char.source,
      template_id: char.templateId,
      generation_prompt: char.generationPrompt
    }))

    const { data: insertedChars, error: insertError } = await supabaseAdmin
      .from('project_characters')
      .insert(charactersToInsert)
      .select()

    if (insertError) {
      console.error('[Video Agent] Failed to insert characters:', insertError)
      return NextResponse.json(
        { error: 'Failed to save characters' },
        { status: 500 }
      )
    }

    // 插入参考图
    for (let i = 0; i < body.characters.length; i++) {
      const char = body.characters[i]
      const insertedChar = insertedChars[i]

      if (char.referenceImages && char.referenceImages.length > 0) {
        const refImagesToInsert = char.referenceImages.map((url, index) => ({
          character_id: insertedChar.id,
          image_url: url,
          image_order: index + 1
        }))

        const { error: refImagesError } = await supabaseAdmin
          .from('character_reference_images')
          .insert(refImagesToInsert)

        if (refImagesError) {
          console.error('[Video Agent] Failed to insert reference images:', refImagesError)
        }
      }
    }

    // 更新项目状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        // 不更新 current_step，由前端在用户点击"继续"时更新
        step_2_status: 'completed'
      })
      .eq('id', projectId)

    console.log('[Video Agent] Characters configured successfully', {
      projectId,
      characterCount: insertedChars.length
    })

    return NextResponse.json({
      success: true,
      data: {
        characters: insertedChars
      }
    })

  } catch (error) {
    console.error('[Video Agent] Configure characters error:', error)
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
 * 获取项目的人物配置
 * GET /api/video-agent/projects/[id]/characters
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.uuid) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const projectId = params.id

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', session.user.uuid)
      .single()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 获取人物配置和参考图
    const { data: characters, error } = await supabaseAdmin
      .from('project_characters')
      .select(`
        *,
        character_reference_images (
          image_url,
          image_order
        )
      `)
      .eq('project_id', projectId)
      .order('created_at')

    if (error) {
      console.error('[Video Agent] Failed to fetch characters:', error)
      return NextResponse.json(
        { error: 'Failed to fetch characters' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: characters || []
    })

  } catch (error) {
    console.error('[Video Agent] Get characters error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
