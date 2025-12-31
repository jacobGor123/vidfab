/**
 * Video Agent - 人物配置 API
 * 配置项目中的人物角色和参考图
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectCharacter = Database['public']['Tables']['project_characters']['Row']

/**
 * 配置人物角色
 * POST /api/video-agent/projects/[id]/characters
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
        negativePrompt?: string  // 🔥 添加类型定义
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
      generation_prompt: char.generationPrompt,
      negative_prompt: char.negativePrompt
    }))

    const { data: insertedChars, error: insertError } = await supabaseAdmin
      .from('project_characters')
      .insert(charactersToInsert as any)
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
      } as any)
      .eq('id', projectId)
      .returns<any>()

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
})

/**
 * 获取项目的人物配置
 * GET /api/video-agent/projects/[id]/characters
 */
export const GET = withAuth(async (request, { params, userId }) => {
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
})
