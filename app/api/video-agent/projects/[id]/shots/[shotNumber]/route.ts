/**
 * Video Agent - Shot 删除 API
 * DELETE /api/video-agent/projects/[id]/shots/[shotNumber]
 * 删除指定的分镜，并自动重新编号、更新角色列表、级联更新相关记录
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ScriptAnalysisResult, Shot } from '@/lib/types/video-agent'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 从 shots 数组中提取所有唯一角色
 */
function extractUniqueCharacters(shots: Shot[]): string[] {
  const characterSet = new Set<string>()

  shots.forEach(shot => {
    if (Array.isArray(shot.characters)) {
      shot.characters.forEach(char => {
        if (char && char.trim()) {
          characterSet.add(char.trim())
        }
      })
    }
  })

  return Array.from(characterSet).sort()
}

/**
 * 重新计算所有shot的time_range
 * 确保时间范围连续且正确
 * 格式：与原始脚本分析保持一致 "0.0-5.0s"
 */
function recalculateTimeRanges(shots: Shot[]): Shot[] {
  let currentTime = 0

  return shots.map(shot => {
    const startTime = currentTime
    const endTime = currentTime + shot.duration_seconds
    currentTime = endTime

    return {
      ...shot,
      time_range: `${startTime.toFixed(1)}-${endTime.toFixed(1)}s`
    }
  })
}

/**
 * 删除指定的 Shot
 * DELETE /api/video-agent/projects/[id]/shots/[shotNumber]
 */
export const DELETE = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id
    const shotNumber = parseInt(params.shotNumber, 10)

    if (isNaN(shotNumber) || shotNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid shot number', code: 'INVALID_SHOT_NUMBER' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] DELETE shot:', { projectId, shotNumber, userId })

    // 1. 验证项目所有权并获取项目数据
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      console.error('[Video Agent] Project not found or access denied:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 2. 检查 script_analysis 是否存在
    const scriptAnalysis = project.script_analysis as unknown as ScriptAnalysisResult
    if (!scriptAnalysis || !Array.isArray(scriptAnalysis.shots)) {
      return NextResponse.json(
        { error: 'No script analysis found', code: 'NO_SCRIPT_ANALYSIS' },
        { status: 400 }
      )
    }

    const shots = scriptAnalysis.shots as Shot[]

    // 3. 检查 shot_number 是否存在
    const shotToDelete = shots.find(s => s.shot_number === shotNumber)
    if (!shotToDelete) {
      return NextResponse.json(
        { error: 'Shot not found', code: 'SHOT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 4. 检查是否是最后一个 shot（至少保留一个）
    if (shots.length === 1) {
      return NextResponse.json(
        { error: 'Cannot delete the last shot. At least one shot is required.', code: 'LAST_SHOT' },
        { status: 400 }
      )
    }

    console.log('[Video Agent] Deleting shot:', {
      shotNumber,
      totalShots: shots.length,
      shotDescription: shotToDelete.description.substring(0, 50) + '...'
    })

    // 5. 删除 shot 并重新编号
    let newShots = shots
      .filter(s => s.shot_number !== shotNumber)
      .map((shot, index) => ({
        ...shot,
        shot_number: index + 1  // 重新编号从 1 开始
      }))

    // 6. 🔥 重新计算time_range，确保时间连续
    newShots = recalculateTimeRanges(newShots)

    // 7. 🔥 重新计算总时长
    const newDuration = newShots.reduce((sum, shot) => sum + shot.duration_seconds, 0)

    // 8. 重新提取角色列表
    const newCharacters = extractUniqueCharacters(newShots)

    console.log('[Video Agent] After deletion:', {
      oldShotCount: shots.length,
      newShotCount: newShots.length,
      oldDuration: scriptAnalysis.duration,
      newDuration: newDuration,
      oldCharacters: scriptAnalysis.characters,
      newCharacters: newCharacters,
      charactersChanged: JSON.stringify(scriptAnalysis.characters) !== JSON.stringify(newCharacters)
    })

    // 9. 更新 script_analysis
    const newScriptAnalysis: ScriptAnalysisResult = {
      ...scriptAnalysis,
      shots: newShots,
      characters: newCharacters,
      shot_count: newShots.length,
      duration: newDuration  // 🔥 更新总时长
    }

    // 10. 更新项目数据库
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        script_analysis: newScriptAnalysis as any,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)

    if (updateError) {
      console.error('[Video Agent] Failed to update project:', updateError)
      throw new Error(`Failed to update project: ${updateError.message}`)
    }

    // 11. 级联删除：删除对应的 storyboard 记录
    const { error: deleteStoryboardError } = await supabaseAdmin
      .from('project_storyboards')
      .delete()
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)

    if (deleteStoryboardError) {
      console.warn('[Video Agent] Failed to delete storyboard:', deleteStoryboardError)
    } else {
      console.log('[Video Agent] Deleted storyboard for shot:', shotNumber)
    }

    // 12. 级联删除：删除对应的 video_clip 记录
    const { error: deleteVideoError } = await supabaseAdmin
      .from('project_video_clips')
      .delete()
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)

    if (deleteVideoError) {
      console.warn('[Video Agent] Failed to delete video clip:', deleteVideoError)
    } else {
      console.log('[Video Agent] Deleted video clip for shot:', shotNumber)
    }

    // 13. 级联更新：更新后续 storyboards 的 shot_number
    // 对于所有 shot_number > deletedNumber 的记录，shot_number 都要 -1
    if (shotNumber < shots.length) {
      console.log('[Video Agent] Updating storyboard shot_numbers after deletion...')

      for (let i = shotNumber + 1; i <= shots.length; i++) {
        const { error: updateStoryboardError } = await supabaseAdmin
          .from('project_storyboards')
          .update({ shot_number: i - 1, updated_at: new Date().toISOString() } as any)
          .eq('project_id', projectId)
          .eq('shot_number', i)

        if (updateStoryboardError) {
          console.warn(`[Video Agent] Failed to update storyboard ${i}:`, updateStoryboardError)
        }
      }
    }

    // 14. 级联更新：更新后续 video_clips 的 shot_number
    if (shotNumber < shots.length) {
      console.log('[Video Agent] Updating video clip shot_numbers after deletion...')

      for (let i = shotNumber + 1; i <= shots.length; i++) {
        const { error: updateVideoError } = await supabaseAdmin
          .from('project_video_clips')
          .update({ shot_number: i - 1, updated_at: new Date().toISOString() } as any)
          .eq('project_id', projectId)
          .eq('shot_number', i)

        if (updateVideoError) {
          console.warn(`[Video Agent] Failed to update video clip ${i}:`, updateVideoError)
        }
      }
    }

    // 15. 如果角色列表发生变化，删除不再需要的角色记录
    if (JSON.stringify(scriptAnalysis.characters) !== JSON.stringify(newCharacters)) {
      console.log('[Video Agent] Characters changed, cleaning up character records...')

      const removedCharacters = (scriptAnalysis.characters || []).filter(
        char => !newCharacters.includes(char)
      )

      if (removedCharacters.length > 0) {
        console.log('[Video Agent] Removing character records:', removedCharacters)

        for (const charName of removedCharacters) {
          const { error: deleteCharError } = await supabaseAdmin
            .from('project_characters')
            .delete()
            .eq('project_id', projectId)
            .eq('character_name', charName)

          if (deleteCharError) {
            console.warn(`[Video Agent] Failed to delete character ${charName}:`, deleteCharError)
          }
        }
      }
    }

    // 16. 如果项目已经进行到后续步骤，重置相关步骤状态
    // 因为 shots 发生了变化，后续步骤的数据可能不一致
    if (project.current_step && project.current_step >= 2) {
      console.log('[Video Agent] Resetting project steps from step 2...')

      const { error: resetError } = await supabaseAdmin
        .from('video_agent_projects')
        .update({
          // 重置 Step 3, 4, 5 的状态
          step_3_status: null,
          step_4_status: null,
          step_5_status: null,
          updated_at: new Date().toISOString()
        } as any)
        .eq('id', projectId)

      if (resetError) {
        console.warn('[Video Agent] Failed to reset project steps:', resetError)
      }
    }

    console.log('[Video Agent] Shot deleted successfully:', {
      deletedShot: shotNumber,
      newShotCount: newShots.length,
      newCharacterCount: newCharacters.length
    })

    return NextResponse.json({
      success: true,
      data: {
        deletedShotNumber: shotNumber,
        newShotCount: newShots.length,
        newCharacters: newCharacters,
        charactersRemoved: (scriptAnalysis.characters || []).filter(
          char => !newCharacters.includes(char)
        )
      }
    })

  } catch (error) {
    console.error('[Video Agent] Delete shot error:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete shot',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
})

/**
 * 更新单个 Shot 的输入字段
 * PATCH /api/video-agent/projects/[id]/shots/[shotNumber]
 *
 * Used for persisting edits made in Step1 (e.g. right-side Character Action textarea)
 * so refreshes / character replacements can reuse the latest user inputs.
 */
export const PATCH = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id
    const shotNumber = parseInt(params.shotNumber, 10)

    if (isNaN(shotNumber) || shotNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid shot number', code: 'INVALID_SHOT_NUMBER' },
        { status: 400 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const nextDescription = typeof body.description === 'string' ? body.description : undefined
    const nextAction = typeof body.character_action === 'string' ? body.character_action : undefined
    const nextVideoPrompt = typeof body.video_prompt === 'string' ? body.video_prompt : undefined

    if (nextDescription === undefined && nextAction === undefined && nextVideoPrompt === undefined) {
      return NextResponse.json(
        { error: 'No valid fields to update', code: 'NO_FIELDS' },
        { status: 400 }
      )
    }

    // Verify ownership.
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('id, user_id, script_analysis')
      .eq('id', projectId)
      .single<VideoAgentProject>()

    if (projectError || !project) {
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    if (project.user_id !== userId) {
      return NextResponse.json(
        { error: 'Access denied', code: 'ACCESS_DENIED' },
        { status: 403 }
      )
    }

    const patch: any = {}
    if (nextDescription !== undefined) patch.description = nextDescription
    if (nextAction !== undefined) patch.character_action = nextAction
    if (nextVideoPrompt !== undefined) patch.video_prompt = nextVideoPrompt

    const { error: shotUpdateError } = await supabaseAdmin
      .from('project_shots')
      .update(patch)
      .eq('project_id', projectId)
      .eq('shot_number', shotNumber)
      .returns<any>()

    if (shotUpdateError) {
      console.error('[Video Agent] Failed to update project_shots:', shotUpdateError)
      return NextResponse.json(
        { error: 'Failed to update shot', code: 'SHOT_UPDATE_FAILED' },
        { status: 500 }
      )
    }

    // Best-effort: keep script_analysis in sync so the UI stays consistent.
    try {
      const analysis = project.script_analysis as unknown as ScriptAnalysisResult
      if (analysis && Array.isArray(analysis.shots)) {
        const nextShots = (analysis.shots as Shot[]).map((s) => {
          if (s.shot_number !== shotNumber) return s
          return {
            ...s,
            ...(nextDescription !== undefined ? { description: nextDescription } : null),
            ...(nextAction !== undefined ? { character_action: nextAction } : null),
            ...(nextVideoPrompt !== undefined ? { video_prompt: nextVideoPrompt } : null)
          } as any
        })

        const nextAnalysis: ScriptAnalysisResult = {
          ...(analysis as any),
          shots: nextShots as any
        }

        await supabaseAdmin
          .from('video_agent_projects')
          .update({ script_analysis: nextAnalysis as any, updated_at: new Date().toISOString() } as any)
          .eq('id', projectId)
      }
    } catch (syncErr) {
      console.warn('[Video Agent] PATCH shot: failed to sync script_analysis (non-fatal):', syncErr)
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        shotNumber,
        updated: {
          ...(nextDescription !== undefined ? { description: true } : null),
          ...(nextAction !== undefined ? { character_action: true } : null),
          ...(nextVideoPrompt !== undefined ? { video_prompt: true } : null)
        }
      }
    })
  } catch (error) {
    console.error('[Video Agent] PATCH /shots/[shotNumber] error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
