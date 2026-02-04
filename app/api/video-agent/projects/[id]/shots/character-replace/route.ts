/**
 * Video Agent - Batch replace character names inside shot input fields
 * POST /api/video-agent/projects/[id]/shots/character-replace
 *
 * Why this exists:
 * - Step2 character replacement updates project_characters (names/images/prompts)
 * - But shot input fields used for generation live in project_shots + script_analysis
 * - Without syncing, users must manually edit prompts/action per shot.
 *
 * This endpoint updates ONLY inputs (description/character_action/video_prompt + shot.characters in script_analysis)
 * and does NOT trigger any regeneration of storyboard images or videos.
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ScriptAnalysisResult, Shot } from '@/lib/types/video-agent'
import { buildVideoPrompt } from '@/lib/services/video-agent/video-prompt-builder'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function shortName(name: string): string {
  return String(name || '').split('(')[0].trim()
}

/**
 * 从角色名称的括号描述中提取动物类型
 * 例如: "Alex (a cat, wearing...)" → "cat"
 *       "Alex (Golden Retriever puppy, ...)" → "golden retriever puppy"
 */
function extractAnimalTypeFromDescription(name: string): string | null {
  const fullName = String(name || '').trim()
  const parenMatch = fullName.match(/\(([^)]+)\)/)
  if (!parenMatch) return null

  const description = parenMatch[1].trim().toLowerCase()

  // 动物词典（包括常见的品种和描述）
  const animalPatterns = [
    // 狗的品种
    /\b(golden retriever|labrador|poodle|bulldog|beagle|husky|corgi|dachshund|chihuahua|pug|shepherd|retriever|terrier)\s*(puppy|dog)?\b/i,
    // 猫的品种
    /\b(persian|siamese|maine coon|ragdoll|bengal|british shorthair|tabby)\s*(cat|kitten)?\b/i,
    // 通用动物 + 修饰词
    /\b(a|an|the)?\s*(cute|adorable|fluffy|small|big|little|young|baby)?\s*(cat|dog|tiger|lion|bear|cow|horse|duck|chicken|sheep|pig|rabbit|mouse|bird|fish|elephant|giraffe|monkey|panda|fox|wolf|deer|puppy|kitten)\b/i,
    // 纯动物名
    /\b(cat|dog|tiger|lion|bear|cow|horse|duck|chicken|sheep|pig|rabbit|mouse|bird|fish|elephant|giraffe|monkey|panda|fox|wolf|deer|puppy|kitten)\b/i
  ]

  for (const pattern of animalPatterns) {
    const match = description.match(pattern)
    if (match) {
      // 提取匹配到的动物类型，去掉冠词
      let animalType = match[0].trim()
      animalType = animalType.replace(/^(a|an|the)\s+/i, '').trim()
      return animalType
    }
  }

  return null
}

/**
 * 生成动物描述的所有可能变体
 * 例如: "golden retriever puppy" → ["golden retriever puppy", "the golden retriever puppy", "a golden retriever puppy"]
 */
function generateAnimalDescriptionVariants(animalType: string): string[] {
  const variants = new Set<string>()
  const lower = animalType.toLowerCase().trim()

  variants.add(lower)
  variants.add(`the ${lower}`)
  variants.add(`a ${lower}`)
  variants.add(`an ${lower}`)

  // 如果包含多个单词，也尝试首字母大写的版本
  const words = lower.split(/\s+/)
  if (words.length > 1) {
    const titleCase = words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    variants.add(titleCase)
    variants.add(`the ${titleCase}`)
    variants.add(`a ${titleCase}`)
    variants.add(`an ${titleCase}`)
  }

  return Array.from(variants)
}

function toGenericAliases(name: string): string[] {
  const n = shortName(name).trim().toLowerCase()
  if (!n) return []
  const aliases = new Set<string>()

  // If the short name already includes a species keyword, also allow "the <species>" forms.
  // This keeps "strict replace" within the same story action while swapping the referred character.
  const species = ['cat', 'dog', 'tiger', 'lion', 'bear', 'cow', 'horse', 'duck', 'chicken', 'sheep', 'pig']
  for (const s of species) {
    if (n.includes(s)) {
      aliases.add(`the ${s}`)
      aliases.add(s)
    }
  }

  // Special-case common phrasing.
  if (n === 'orange cat' || (n.includes('cat') && n.includes('orange'))) {
    aliases.add('the orange cat')
    aliases.add('orange cat')
  }

  // If the short name includes a color + species pattern (e.g. "Orange Cat"),
  // also replace the common descriptive form "the <color> <species>" used in scripts.
  const colors = ['orange', 'black', 'white', 'brown', 'gray', 'grey', 'red', 'blue', 'green', 'yellow', 'pink', 'purple', 'gold', 'silver']
  for (const s of species) {
    for (const c of colors) {
      if (n.includes(s) && n.includes(c)) {
        aliases.add(`${c} ${s}`)
        aliases.add(`the ${c} ${s}`)
      }
    }
  }

  return Array.from(aliases)
}

function replaceCharacterNameInText(input: string, from: string, to: string): string {
  const text = String(input || '')
  const fromShort = shortName(from)
  const toShort = shortName(to)
  if (!fromShort || !toShort) return text

  // 1) Prefer word-boundary replacement for the short name.
  // 2) Also handle the common "Name (" pattern (full format appears in some fields).
  // Case-insensitive: script analysis descriptions often use lowercase (e.g. "orange cat")
  // while character display names are Title Case.
  const reWord = new RegExp(`\\b${escapeRegExp(fromShort)}\\b`, 'gi')
  const reParen = new RegExp(`${escapeRegExp(fromShort)}\\s*\\(`, 'g')

  let out = text.replace(reWord, toShort)
  out = out.replace(reParen, `${toShort} (`)

  // Also replace generic aliases like "the orange cat" when they clearly refer to this character.
  // This is still "strict": we only substitute the referenced subject, not rewrite the scene.
  for (const alias of toGenericAliases(fromShort)) {
    if (!alias) continue
    const reAlias = new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'gi')
    out = out.replace(reAlias, toShort)
  }

  // 🔥 新增：处理括号描述中的动物类型替换
  // 例如: "Alex" → "Alex (a cat, ...)" 时，需要把 "golden retriever puppy" 替换为 "cat"
  const oldAnimalType = extractAnimalTypeFromDescription(from)
  const newAnimalType = extractAnimalTypeFromDescription(to)

  if (newAnimalType) {
    // 如果新角色有动物类型描述
    if (oldAnimalType) {
      // 情况1：旧角色也有动物描述 → 直接替换旧动物为新动物
      // 例如: "golden retriever puppy" → "cat"
      const oldVariants = generateAnimalDescriptionVariants(oldAnimalType)
      for (const oldVariant of oldVariants) {
        if (!oldVariant) continue
        const reOldAnimal = new RegExp(`\\b${escapeRegExp(oldVariant)}\\b`, 'gi')
        // 替换时保持冠词的一致性：如果原文是 "A/The"，保留 "A/The"
        out = out.replace(reOldAnimal, (match) => {
          // 检查匹配的前缀
          if (match.toLowerCase().startsWith('a ')) return `a ${newAnimalType}`
          if (match.toLowerCase().startsWith('an ')) return `an ${newAnimalType}`
          if (match.toLowerCase().startsWith('the ')) return `the ${newAnimalType}`
          // 如果是首字母大写，保持首字母大写
          if (match[0] === match[0].toUpperCase()) {
            return newAnimalType.charAt(0).toUpperCase() + newAnimalType.slice(1)
          }
          return newAnimalType
        })
      }
    } else {
      // 情况2：旧角色没有动物描述，但可能文本中有通用的动物引用
      // 尝试查找并替换常见的动物描述
      // 这种情况比较复杂，暂时跳过，避免误替换
    }
  }

  return out
}

function hasAnyReplacementTarget(input: string, from: string): boolean {
  const text = String(input || '')
  const fromShort = shortName(from)
  if (!fromShort) return false

  const targets = [fromShort, ...toGenericAliases(fromShort)]
  for (const t of targets) {
    if (!t) continue
    const re = new RegExp(`\\b${escapeRegExp(t)}\\b`, 'i')
    if (re.test(text)) return true
  }

  // 🔥 新增：也检查是否包含旧的动物类型描述
  const oldAnimalType = extractAnimalTypeFromDescription(from)
  if (oldAnimalType) {
    const animalVariants = generateAnimalDescriptionVariants(oldAnimalType)
    for (const variant of animalVariants) {
      if (!variant) continue
      const re = new RegExp(`\\b${escapeRegExp(variant)}\\b`, 'i')
      if (re.test(text)) return true
    }
  }

  return false
}

function replaceCharacterNameInListExact(list: unknown, from: string, to: string): unknown {
  if (!Array.isArray(list)) return list
  const fromShort = shortName(from).trim().toLowerCase()
  const toShort = shortName(to).trim()
  if (!fromShort || !toShort) return list

  // 🔥 增强：获取所有可能的别名（例如 "the dog", "dog", "the orange cat"）
  const fromAliases = [fromShort, ...toGenericAliases(from)]

  return (list as any[]).map((raw) => {
    const s = String(raw || '').trim()
    if (!s) return raw
    const base = s.split('(')[0].trim().toLowerCase()

    // 🔥 增强：匹配任何别名，不仅仅是精确名称
    if (fromAliases.some(alias => alias === base)) {
      const leftParen = s.indexOf('(')
      if (leftParen === -1) return toShort
      // Preserve legacy detail suffix in UI tags.
      return `${toShort} ${s.slice(leftParen).trim()}`
    }
    return raw
  })
}

function replaceInShotFields(shot: ProjectShot, from: string, to: string): Partial<ProjectShot> {
  const description = replaceCharacterNameInText(shot.description, from, to)
  const character_action = replaceCharacterNameInText(shot.character_action, from, to)

  // video_prompt can be either:
  // - derived from shot fields (preferred)
  // - or manually edited by users (still we do a safe name replacement)
  let nextVideoPrompt: string | null = shot.video_prompt
  if (typeof nextVideoPrompt === 'string') {
    nextVideoPrompt = replaceCharacterNameInText(nextVideoPrompt, from, to)
  }

  // If video_prompt is missing, rebuild it so future generations are consistent.
  if (!nextVideoPrompt || !nextVideoPrompt.trim()) {
    nextVideoPrompt = buildVideoPrompt({
      shot_number: shot.shot_number,
      time_range: shot.time_range,
      description,
      character_action,
      characters: [],
      duration_seconds: shot.duration_seconds,
      camera_angle: shot.camera_angle,
      mood: shot.mood,
      video_prompt: undefined
    })
  }

  return {
    description,
    character_action,
    video_prompt: nextVideoPrompt,
    // project_shots.updated_at may not exist in older schemas; rely on DB defaults/triggers.
  }
}

export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id
    const body = await request.json().catch(() => ({}))
    const fromName = String(body.fromName || '').trim()
    const toName = String(body.toName || '').trim()
    const scope = (body.scope === 'all' || body.scope === 'mentioned') ? body.scope : 'all'

    console.log('[Video Agent] /shots/character-replace called:', {
      projectId,
      scope,
      fromName,
      toName
    })

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required', code: 'PROJECT_ID_MISSING' }, { status: 400 })
    }
    if (!fromName || !toName) {
      return NextResponse.json({ error: 'fromName and toName are required', code: 'INVALID_INPUT' }, { status: 400 })
    }

    // Verify ownership and load script_analysis for syncing.
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id, user_id, script_analysis')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json({ error: 'Project not found', code: 'PROJECT_NOT_FOUND' }, { status: 404 })
    }
    if (project.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied', code: 'ACCESS_DENIED' }, { status: 403 })
    }

    // Load all shots (generation uses DB shots for video; storyboard regenerate uses script_analysis).
    const { data: shots, error: shotsError } = await supabaseAdmin
      .from('project_shots')
      .select('*')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })
      .returns<ProjectShot[]>()

    if (shotsError) {
      console.error('[Video Agent] Failed to load project_shots:', shotsError)
      return NextResponse.json({ error: 'Failed to load shots', code: 'SHOTS_LOAD_FAILED' }, { status: 500 })
    }

    const fromShort = shortName(fromName).toLowerCase()
    const shouldUpdate = (shot: ProjectShot) => {
      if (scope !== 'mentioned') return true
      // Note: script text can refer to characters via aliases (e.g. "the orange cat").
      // Use the same matching logic as replacement to decide whether to update.
      return (
        hasAnyReplacementTarget(shot.description, fromName) ||
        hasAnyReplacementTarget(shot.character_action, fromName) ||
        hasAnyReplacementTarget(shot.video_prompt, fromName)
      )
    }

    const updates = (shots || [])
      .filter(shouldUpdate)
      .map((shot) => ({
        project_id: projectId,
        shot_number: shot.shot_number,
        ...replaceInShotFields(shot, fromName, toName)
      }))

    if (updates.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('project_shots')
        .upsert(updates as any, { onConflict: 'project_id,shot_number' })
        .returns<any>()

      if (upsertError) {
        console.error('[Video Agent] Failed to update project_shots:', upsertError)
        return NextResponse.json({ error: 'Failed to update shots', code: 'SHOTS_UPDATE_FAILED' }, { status: 500 })
      }
    }

    // Sync script_analysis so the UI & storyboard regenerate share the same updated inputs.
    let nextAnalysis: ScriptAnalysisResult | null = null
    if (project.script_analysis && typeof project.script_analysis === 'object') {
      const analysis = project.script_analysis as unknown as ScriptAnalysisResult
      if (Array.isArray(analysis.shots)) {
        let replacedDescriptionCount = 0
        let replacedActionCount = 0
        let replacedPromptCount = 0
        let replacedCharactersCount = 0  // 🔥 新增：追踪 characters 数组的替换

        const nextShots = analysis.shots.map((s: any) => {
          const shot = s as Shot

          const nextDescription = replaceCharacterNameInText(String(shot.description || ''), fromName, toName)
          const nextAction = replaceCharacterNameInText(String(shot.character_action || ''), fromName, toName)
          const nextPrompt = typeof (shot as any).video_prompt === 'string'
            ? replaceCharacterNameInText(String((shot as any).video_prompt || ''), fromName, toName)
            : (shot as any).video_prompt

          if (nextDescription !== String(shot.description || '')) replacedDescriptionCount++
          if (nextAction !== String(shot.character_action || '')) replacedActionCount++
          if (typeof (shot as any).video_prompt === 'string' && nextPrompt !== String((shot as any).video_prompt || '')) {
            replacedPromptCount++
          }

          const updated = {
            ...shot,
            description: nextDescription,
            character_action: nextAction,
            video_prompt: nextPrompt
          }

          // Keep shot.characters aligned if present.
          if (Array.isArray((shot as any).characters)) {
            const oldCharacters = (shot as any).characters
            const newCharacters = replaceCharacterNameInListExact(
              oldCharacters,
              fromName,
              toName
            )
            ;(updated as any).characters = newCharacters

            // 🔥 新增：记录 characters 数组的变化
            if (JSON.stringify(oldCharacters) !== JSON.stringify(newCharacters)) {
              replacedCharactersCount++
              console.log(`[Video Agent] Shot ${shot.shot_number} characters updated:`, {
                before: oldCharacters,
                after: newCharacters
              })
            }
          }

          // If analysis video_prompt is empty, derive it.
          if (!(updated as any).video_prompt || !String((updated as any).video_prompt).trim()) {
            ;(updated as any).video_prompt = buildVideoPrompt(updated)
          }
          return updated
        })

        // Keep analysis.characters list aligned.
        const nextCharacters = replaceCharacterNameInListExact(
          (analysis as any).characters,
          fromName,
          toName
        )

        nextAnalysis = {
          ...analysis,
          shots: nextShots as any,
          characters: nextCharacters as any
        }

        console.log('[Video Agent] /shots/character-replace sync summary:', {
          shotCount: Array.isArray(nextAnalysis.shots) ? nextAnalysis.shots.length : null,
          charactersCount: Array.isArray(nextAnalysis.characters) ? nextAnalysis.characters.length : null,
          replacedDescriptionCount,
          replacedActionCount,
          replacedPromptCount,
          replacedCharactersCount,  // 🔥 新增：显示替换的 characters 数组数量
          sampleCharacters: Array.isArray(nextAnalysis.characters) ? nextAnalysis.characters.slice(0, 6) : null,
          fromName,  // 🔥 新增：记录替换的源和目标
          toName
        })

        const { error: analysisUpdateError } = await supabaseAdmin
          .from('video_agent_projects')
          .update({
            script_analysis: nextAnalysis as any,
            updated_at: new Date().toISOString()
          } as any)
          .eq('id', projectId)

        if (analysisUpdateError) {
          console.warn('[Video Agent] Failed to sync script_analysis:', analysisUpdateError)
        }
      }
    }

    // IMPORTANT: keep the API response shape consistent with callAPI expectations
    // (callAPI returns `data.data`).
    return NextResponse.json({
      success: true,
      data: {
        projectId,
        fromName,
        toName,
        updatedShots: updates.length,
        script_analysis: nextAnalysis
      }
    })
  } catch (error) {
    console.error('[Video Agent] POST /shots/character-replace error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
