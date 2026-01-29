/**
 * Video Agent - Batch rewrite shot prompts after character replacement
 * POST /api/video-agent/projects/[id]/shots/rewrite-prompts
 *
 * Scope:
 * - Updates ONLY shot input fields (project_shots + script_analysis)
 * - Does NOT regenerate storyboard images or videos
 *
 * Strict replace-only mode:
 * - Preserve story/scene content
 * - Only replace character names inside existing text fields
 * - Do NOT inject new sentences or attempt to "fix" actions
 */

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { ScriptAnalysisResult, Shot } from '@/lib/types/video-agent'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']

function shortName(name: string): string {
  return String(name || '').split('(')[0].trim()
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function replaceNameStrict(input: string, from: string, to: string): string {
  const text = String(input || '')
  const fromShort = shortName(from)
  const toShort = shortName(to)
  if (!fromShort || !toShort) return text

  // Replace short name as a whole word.
  const reWord = new RegExp(`\\b${escapeRegExp(fromShort)}\\b`, 'g')
  // Also handle "Name (" full-format occurrences, but only replace the prefix.
  const reParen = new RegExp(`${escapeRegExp(fromShort)}\\s*\\(`, 'g')

  let out = text.replace(reWord, toShort)
  out = out.replace(reParen, `${toShort} (`)
  return out
}

function mentionsCharacter(text: string, name: string): boolean {
  const n = shortName(name).toLowerCase()
  if (!n) return false
  return String(text || '').toLowerCase().includes(n)
}

function rewriteShotFieldsStrict(
  shot: ProjectShot,
  fromName: string,
  toName: string
): { description: string; character_action: string; video_prompt: string | null } {
  const description = replaceNameStrict(shot.description, fromName, toName)
  const character_action = replaceNameStrict(shot.character_action, fromName, toName)
  const video_prompt = typeof shot.video_prompt === 'string'
    ? replaceNameStrict(shot.video_prompt, fromName, toName)
    : shot.video_prompt

  return { description, character_action, video_prompt }
}

export const POST = withAuth(async (request, { params, userId }) => {
  try {
    const projectId = params.id
    const body = await request.json().catch(() => ({}))
    const fromName = String(body.fromName || '').trim()
    const toName = String(body.toName || '').trim()
    const scope = (body.scope === 'all' || body.scope === 'mentioned') ? body.scope : 'mentioned'

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required', code: 'PROJECT_ID_MISSING' }, { status: 400 })
    }
    if (!fromName || !toName) {
      return NextResponse.json({ error: 'fromName and toName are required', code: 'INVALID_INPUT' }, { status: 400 })
    }

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

    const shouldRewrite = (shot: ProjectShot) => {
      if (scope === 'all') return true
      const combined = `${shot.description || ''} ${shot.character_action || ''} ${shot.video_prompt || ''}`
      return mentionsCharacter(combined, fromName)
    }

    const rewritten = (shots || [])
      .filter(shouldRewrite)
      .map((shot) => {
        const next = rewriteShotFieldsStrict(shot, fromName, toName)
        return {
          project_id: projectId,
          shot_number: shot.shot_number,
          ...next,
          updated_at: new Date().toISOString()
        }
      })

    if (rewritten.length > 0) {
      const { error: upsertError } = await supabaseAdmin
        .from('project_shots')
        .upsert(rewritten as any, { onConflict: 'project_id,shot_number' })
        .returns<any>()

      if (upsertError) {
        console.error('[Video Agent] Failed to update project_shots (rewrite):', upsertError)
        return NextResponse.json({ error: 'Failed to rewrite shots', code: 'SHOTS_REWRITE_FAILED' }, { status: 500 })
      }
    }

    // Sync script_analysis (best-effort)
    let nextAnalysis: ScriptAnalysisResult | null = null
    if (project.script_analysis && typeof project.script_analysis === 'object') {
      const analysis = project.script_analysis as unknown as ScriptAnalysisResult
      if (analysis && Array.isArray(analysis.shots)) {
        const byShot = new Map<number, { description: string; character_action: string; video_prompt: string }>()
        rewritten.forEach((r: any) => {
          byShot.set(Number(r.shot_number), {
            description: r.description,
            character_action: r.character_action,
            video_prompt: r.video_prompt
          })
        })

        const nextShots = (analysis.shots as Shot[]).map((s) => {
          const update = byShot.get(s.shot_number)
          if (!update) return s
          return { ...s, ...update } as any
        })

        nextAnalysis = {
          ...(analysis as any),
          shots: nextShots as any
        }

        const { error: analysisUpdateError } = await supabaseAdmin
          .from('video_agent_projects')
          .update({ script_analysis: nextAnalysis as any, updated_at: new Date().toISOString() } as any)
          .eq('id', projectId)

        if (analysisUpdateError) {
          console.warn('[Video Agent] Failed to sync script_analysis (rewrite):', analysisUpdateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        projectId,
        fromName,
        toName,
        scope,
        rewrittenShots: rewritten.length,
        script_analysis: nextAnalysis
      }
    })
  } catch (error) {
    console.error('[Video Agent] POST /shots/rewrite-prompts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
