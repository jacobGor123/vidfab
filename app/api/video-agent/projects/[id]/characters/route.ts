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

    // 🔥 修复：去重人物名称（防止前端传递重复数据）
    const uniqueCharacters = body.characters.filter((char, index, self) =>
      index === self.findIndex(c => c.name === char.name)
    )

    if (uniqueCharacters.length < body.characters.length) {
      console.warn('[Video Agent] Removed duplicate characters:', {
        original: body.characters.length,
        unique: uniqueCharacters.length,
        duplicates: body.characters.map(c => c.name).filter((name, index, arr) => arr.indexOf(name) !== index)
      })
    }

    // 🔥 改进：使用增量更新逻辑，而不是先删除再插入
    // 对于每个人物，检查是否已存在，如果存在则更新，否则插入
    const insertedChars: any[] = []

    for (const char of uniqueCharacters) {
      // 检查人物是否已存在
      const { data: existingChar } = await supabaseAdmin
        .from('project_characters')
        .select('*')
        .eq('project_id', projectId)
        .eq('character_name', char.name)
        .single()

      let characterRecord: any

      if (existingChar) {
        // 🔥 已存在，更新记录
        const { data: updatedChar, error: updateError } = await supabaseAdmin
          .from('project_characters')
          .update({
            source: char.source,
            template_id: char.templateId,
            generation_prompt: char.generationPrompt,
            negative_prompt: char.negativePrompt
          } as any)
          .eq('id', existingChar.id)
          .select()
          .single()

        if (updateError) {
          console.error(`[Video Agent] Failed to update character ${char.name}:`, updateError)
          continue
        }

        characterRecord = updatedChar

        // 🔥 删除旧的参考图（检查删除结果）
        const { error: deleteError } = await supabaseAdmin
          .from('character_reference_images')
          .delete()
          .eq('character_id', existingChar.id)

        if (deleteError) {
          console.warn(`[Video Agent] Failed to delete old reference images for ${char.name}:`, deleteError)
          // 继续执行，因为可能已经没有旧图片了
        }

        console.log(`[Video Agent] Updated existing character: ${char.name}`)
      } else {
        // 🔥 不存在，插入新记录
        const { data: newChar, error: insertError } = await supabaseAdmin
          .from('project_characters')
          .insert({
            project_id: projectId,
            character_name: char.name,
            source: char.source,
            template_id: char.templateId,
            generation_prompt: char.generationPrompt,
            negative_prompt: char.negativePrompt
          } as any)
          .select()
          .single()

        if (insertError) {
          console.error(`[Video Agent] Failed to insert character ${char.name}:`, insertError)
          continue
        }

        characterRecord = newChar
        console.log(`[Video Agent] Inserted new character: ${char.name}`)
      }

      insertedChars.push(characterRecord)

      // 🔥 插入新的参考图（使用 upsert 避免并发冲突）
      if (char.referenceImages && char.referenceImages.length > 0) {
        const refImagesToInsert = char.referenceImages.map((url, index) => ({
          character_id: characterRecord.id,
          image_url: url,
          image_order: index + 1
        }))

        const { error: refImagesError } = await supabaseAdmin
          .from('character_reference_images')
          .upsert(refImagesToInsert, {
            onConflict: 'character_id,image_order',
            ignoreDuplicates: false  // 如果存在则更新，而不是忽略
          })

        if (refImagesError) {
          console.error(`[Video Agent] Failed to upsert reference images for ${char.name}:`, refImagesError)
        } else {
          console.log(`[Video Agent] Successfully saved ${refImagesToInsert.length} reference images for ${char.name}`)
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
