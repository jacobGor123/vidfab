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

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

async function syncCharacterNameChange(params: {
  projectId: string
  oldName: string
  newName: string
}): Promise<{ affectedShotNumbers: number[] }> {
  const { projectId, oldName, newName } = params

  const { data: project } = await supabaseAdmin
    .from('video_agent_projects')
    .select('script_analysis')
    .eq('id', projectId)
    .single()

  if (!project?.script_analysis) return { affectedShotNumbers: [] }

  const scriptAnalysis = project.script_analysis as any
  const oldNamePattern = new RegExp(`\\b${escapeRegExp(oldName)}\\b`, 'gi')

  const updatedCharacters = Array.from(
    new Set(
      (scriptAnalysis.characters || []).map((name: string) =>
        name === oldName ? newName : name
      )
    )
  )

  const updatedShots = (scriptAnalysis.shots || []).map((shot: any) => {
    const next = { ...shot }

    if (Array.isArray(next.characters)) {
      next.characters = Array.from(
        new Set(
          next.characters.map((name: string) => (name === oldName ? newName : name))
        )
      )
    }

    for (const key of ['description', 'camera_angle', 'character_action', 'mood', 'video_prompt']) {
      if (typeof next[key] === 'string' && next[key]) {
        next[key] = next[key].replace(oldNamePattern, newName)
      }
    }

    return next
  })

  await supabaseAdmin
    .from('video_agent_projects')
    .update({
      script_analysis: {
        ...scriptAnalysis,
        characters: updatedCharacters,
        shots: updatedShots
      },
      updated_at: new Date().toISOString()
    } as any)
    .eq('id', projectId)

  const affectedShotNumbers = updatedShots
    .filter((shot: any) => Array.isArray(shot.characters) && shot.characters.includes(newName))
    .map((shot: any) => shot.shot_number)
    .filter((n: any) => typeof n === 'number')

  return { affectedShotNumbers }
}

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
        id?: string
        name: string
        source: 'template' | 'upload' | 'ai_generate'
        templateId?: string
        referenceImages?: string[]
        generationPrompt?: string
        negativePrompt?: string
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

    // A: 不允许重名（case-insensitive）
    const normalizedNames = body.characters.map(c => normalizeName(c.name))
    const lowerNames = normalizedNames.map(n => n.toLowerCase())
    const hasDup = lowerNames.some((n, idx) => lowerNames.indexOf(n) !== idx)
    if (hasDup) {
      return NextResponse.json(
        { error: 'Duplicate character names are not allowed' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Configuring characters for project', {
      projectId,
      characterCount: body.characters.length
    })

    // 规范化 name（trim + collapse spaces）
    const uniqueCharacters = body.characters.map(c => ({
      ...c,
      name: normalizeName(c.name)
    }))

    // 🔥 改进：以 id 为唯一标识更新；仅在缺少 id 时才按名称匹配（兼容旧客户端）
    const insertedChars: any[] = []

    // 预加载当前 DB 角色，用于兼容旧客户端按 name 匹配
    const { data: existingAllChars } = await supabaseAdmin
      .from('project_characters')
      .select('id, character_name')
      .eq('project_id', projectId)

    const existingByLowerName = new Map<string, { id: string; character_name: string }>()
    ;(existingAllChars || []).forEach((c: any) => {
      existingByLowerName.set(String(c.character_name || '').toLowerCase(), {
        id: c.id,
        character_name: c.character_name
      })
    })

    const nameChanges: Array<{ oldName: string; newName: string }> = []

    for (const char of uniqueCharacters) {
      let characterId = char.id
      if (!characterId) {
        const existing = existingByLowerName.get(char.name.toLowerCase())
        characterId = existing?.id
      }

      let characterRecord: any

      if (characterId) {
        const { data: existingChar, error: existingError } = await supabaseAdmin
          .from('project_characters')
          .select('*')
          .eq('id', characterId)
          .eq('project_id', projectId)
          .single()

        if (existingError || !existingChar) {
          console.error('[Video Agent] Character id not found in project:', { projectId, characterId, error: existingError })
          continue
        }

        // 记录改名（用于后续 script_analysis 同步 + outdated）
        if (existingChar.character_name !== char.name) {
          nameChanges.push({ oldName: existingChar.character_name, newName: char.name })
        }

        const { data: updatedChar, error: updateError } = await supabaseAdmin
          .from('project_characters')
          .update({
            character_name: char.name,
            source: char.source,
            template_id: char.templateId,
            generation_prompt: char.generationPrompt,
            negative_prompt: char.negativePrompt
          } as any)
          .eq('id', characterId)
          .select()
          .single()

        if (updateError) {
          console.error(`[Video Agent] Failed to update character ${char.name}:`, updateError)
          continue
        }

        characterRecord = updatedChar
      } else {
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
      }

      insertedChars.push(characterRecord)

      // 插入新的参考图（使用 delete + insert 策略，确保新图片能正确保存）
      if (char.referenceImages && char.referenceImages.length > 0) {
        // 先删除该角色的所有旧参考图
        await supabaseAdmin
          .from('character_reference_images')
          .delete()
          .eq('character_id', characterRecord.id)

        // 然后插入新的参考图
        const refImagesToInsert = char.referenceImages.map((url, index) => ({
          character_id: characterRecord.id,
          image_url: url,
          image_order: index + 1
        }))

        const { error: insertImgError } = await supabaseAdmin
          .from('character_reference_images')
          .insert(refImagesToInsert)

        if (insertImgError) {
          console.error(`[Video Agent] ❌ Failed to insert reference images for ${char.name}:`, insertImgError)
        } else {
          console.log(`[Video Agent] ✅ Inserted ${refImagesToInsert.length} reference image(s) for ${char.name}`)
        }
      }
    }

    // 🔥 增强的孤儿清理逻辑：确保万无一失
    const currentCharacterIds = insertedChars.map(c => c.id).filter(Boolean)
    const currentCharacterNames = insertedChars.map(c => c.character_name.toLowerCase())

    // Step 1: 按 ID 清理孤儿记录
    if (currentCharacterIds.length > 0) {
      const { data: allChars } = await supabaseAdmin
        .from('project_characters')
        .select('id, character_name')
        .eq('project_id', projectId)

      const orphanChars = (allChars || []).filter((c: any) => !currentCharacterIds.includes(c.id))

      if (orphanChars.length > 0) {
        console.log('[Video Agent] 🧹 Step 1: Cleaning up orphan characters by ID:', {
          orphans: orphanChars.map((c: any) => ({ id: c.id, name: c.character_name })),
          currentIds: currentCharacterIds,
          currentNames: insertedChars.map(c => c.character_name)
        })

        const { error: deleteError } = await supabaseAdmin
          .from('project_characters')
          .delete()
          .in('id', orphanChars.map((c: any) => c.id))

        if (deleteError) {
          console.error('[Video Agent] ❌ Failed to delete orphan characters:', deleteError)
        } else {
          console.log('[Video Agent] ✅ Successfully deleted', orphanChars.length, 'orphan character(s)')
        }
      }
    }

    // Step 2: 🔥 新增：检查并清理重名角色（防止并发导致的重复记录）
    const { data: afterCleanupChars } = await supabaseAdmin
      .from('project_characters')
      .select('id, character_name, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })  // 最新的记录在前

    if (afterCleanupChars && afterCleanupChars.length > 0) {
      // 按名称分组（不区分大小写）
      const charsByLowerName = new Map<string, any[]>()
      afterCleanupChars.forEach((c: any) => {
        const lowerName = String(c.character_name || '').toLowerCase()
        if (!charsByLowerName.has(lowerName)) {
          charsByLowerName.set(lowerName, [])
        }
        charsByLowerName.get(lowerName)!.push(c)
      })

      // 找出重复的角色
      const duplicatesToDelete: string[] = []
      charsByLowerName.forEach((chars, lowerName) => {
        if (chars.length > 1) {
          // 保留最新的记录（第一个），删除其余的
          const [keep, ...toDelete] = chars
          duplicatesToDelete.push(...toDelete.map(c => c.id))

          console.warn('[Video Agent] 🔍 Step 2: Found duplicate characters:', {
            name: lowerName,
            count: chars.length,
            keep: { id: keep.id, name: keep.character_name, created_at: keep.created_at },
            delete: toDelete.map(c => ({ id: c.id, name: c.character_name, created_at: c.created_at }))
          })
        }
      })

      // 删除重复的角色
      if (duplicatesToDelete.length > 0) {
        console.log('[Video Agent] 🧹 Step 2: Cleaning up', duplicatesToDelete.length, 'duplicate character(s)')

        const { error: deleteDupError } = await supabaseAdmin
          .from('project_characters')
          .delete()
          .in('id', duplicatesToDelete)

        if (deleteDupError) {
          console.error('[Video Agent] ❌ Failed to delete duplicate characters:', deleteDupError)
        } else {
          console.log('[Video Agent] ✅ Successfully deleted', duplicatesToDelete.length, 'duplicate character(s)')
        }
      }
    }

    // 🔥 如果发生改名，同步到 script_analysis，并标记下游资源为 outdated
    const affectedShotNumbersSet = new Set<number>()
    for (const change of nameChanges) {
      const { affectedShotNumbers } = await syncCharacterNameChange({
        projectId,
        oldName: change.oldName,
        newName: change.newName
      })
      affectedShotNumbers.forEach(n => affectedShotNumbersSet.add(n))
    }

    const affectedShotNumbers = Array.from(affectedShotNumbersSet)
    if (affectedShotNumbers.length > 0) {
      await supabaseAdmin
        .from('project_storyboards')
        .update({ status: 'outdated' } as any)
        .eq('project_id', projectId)
        .in('shot_number', affectedShotNumbers)
        .eq('status', 'success')

      await supabaseAdmin
        .from('project_video_clips')
        .update({ status: 'outdated' } as any)
        .eq('project_id', projectId)
        .in('shot_number', affectedShotNumbers)
        .eq('status', 'success')
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

    console.log('[Video Agent] ✅ Characters configured successfully', {
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

    // 🔥 去重：按 character_name 去重，保留最新的记录（最后一个）
    const uniqueCharacters = (characters || []).reduce((acc: any[], char: any) => {
      const existingIndex = acc.findIndex((c: any) => c.character_name === char.character_name)
      if (existingIndex >= 0) {
        // 已存在，用新的替换（保留最新的）
        acc[existingIndex] = char
      } else {
        acc.push(char)
      }
      return acc
    }, [])

    if (uniqueCharacters.length < (characters || []).length) {
      console.warn('[Video Agent] Detected duplicate characters in DB:', {
        original: (characters || []).length,
        unique: uniqueCharacters.length
      })
    }

    return NextResponse.json({
      success: true,
      data: uniqueCharacters
    })

  } catch (error) {
    console.error('[Video Agent] Get characters error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
