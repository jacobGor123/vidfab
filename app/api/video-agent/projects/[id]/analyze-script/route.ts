/**
 * Video Agent - 脚本分析 API
 * 使用 Gemini 2.0 Flash 分析用户脚本
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { analyzeScript, validateAnalysisResult, generateMusicPrompt } from '@/lib/services/video-agent/script-analyzer-google'
import type { ScriptAnalysisResult } from '@/lib/types/video-agent'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']

/**
 * 分析脚本
 * POST /api/video-agent/projects/[id]/analyze-script
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
      console.error('[Video Agent] Project not found or access denied:', projectError)
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    // 幂等性检查：如果已经有分析结果，直接返回
    if (project.script_analysis && typeof project.script_analysis === 'object') {
      return NextResponse.json({
        success: true,
        data: project.script_analysis,
        cached: true
      })
    }

    // 调用脚本分析服务
    let analysis
    try {
      analysis = await analyzeScript(
        project.original_script,
        project.duration,
        project.story_style
      )
    } catch (analysisError) {
      console.error('[Video Agent] Script analysis failed:', analysisError)
      return NextResponse.json(
        {
          error: 'Script analysis failed',
          details: analysisError instanceof Error ? analysisError.message : 'Unknown error'
        },
        { status: 500 }
      )
    }

    // 验证分析结果
    const validation = validateAnalysisResult(analysis)
    if (!validation.valid) {
      console.error('[Video Agent] Invalid analysis result:', validation.errors)
      return NextResponse.json(
        {
          error: 'Invalid analysis result',
          details: validation.errors
        },
        { status: 500 }
      )
    }

    // 🔥 生成 Suno 音乐 prompt
    let musicPrompt: string | undefined
    try {
      musicPrompt = await generateMusicPrompt(
        project.original_script,
        project.story_style,
        analysis.shots
      )
    } catch (musicError) {
      console.warn('[Video Agent] Failed to generate music prompt (non-critical):', musicError)
      // 音乐 prompt 生成失败不影响主流程，使用默认值
      musicPrompt = undefined
    }

    // 保存分析结果到数据库
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        script_analysis: analysis as any,
        music_generation_prompt: musicPrompt,  // 🔥 保存音乐 prompt
        // 不更新 current_step，由前端在用户点击"继续"时更新
        step_1_status: 'completed'
      } as any)
      .eq('id', projectId)
      .returns<any>()

    if (updateError) {
      console.error('[Video Agent] Failed to save analysis:', updateError)
      return NextResponse.json(
        { error: 'Failed to save analysis' },
        { status: 500 }
      )
    }

    // 🔥 为每个 shot 生成 video_prompt（基于其他字段合成）
    const generateVideoPrompt = (shot: any): string => {
      let prompt = shot.description || ''
      if (shot.character_action) {
        prompt += `. ${shot.character_action}`
      }
      if (shot.camera_angle) {
        prompt += `. ${shot.camera_angle}`
      }
      if (shot.mood) {
        prompt += `. Mood: ${shot.mood}`
      }
      return prompt
    }

    // 保存分镜数据到 project_shots 表
    const shotsToInsert = analysis.shots.map(shot => ({
      project_id: projectId,
      shot_number: shot.shot_number,
      time_range: shot.time_range,
      description: shot.description,
      camera_angle: shot.camera_angle,
      character_action: shot.character_action,
      mood: shot.mood,
      duration_seconds: shot.duration_seconds,
      video_prompt: generateVideoPrompt(shot)  // 🔥 自动生成 video_prompt
    })) as any

    // 🔥 同时更新 analysis.shots 中的 video_prompt，确保 script_analysis 和 project_shots 一致
    analysis.shots = analysis.shots.map(shot => ({
      ...shot,
      video_prompt: generateVideoPrompt(shot)
    }))

    // 🔥 重新保存 script_analysis（包含 video_prompt）
    const { error: updateAnalysisError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        script_analysis: analysis as any
      } as any)
      .eq('id', projectId)

    if (updateAnalysisError) {
      console.warn('[Video Agent] Failed to update script_analysis with video_prompt:', updateAnalysisError)
    }

    const { error: shotsError } = await supabaseAdmin
      .from('project_shots')
      .upsert(shotsToInsert, {
        onConflict: 'project_id,shot_number'
      })

    if (shotsError) {
      console.error('[Video Agent] Failed to save shots:', shotsError)
      // 不返回错误,因为主要数据已经保存在 script_analysis 字段中
    }

    return NextResponse.json({
      success: true,
      data: analysis
    })

  } catch (error) {
    console.error('[Video Agent] Analyze script error:', error)
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
