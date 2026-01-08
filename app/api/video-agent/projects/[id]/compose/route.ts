/**
 * Video Agent - 视频合成 API
 * POST: 开始合成最终视频 (步骤 6 - Final Composition)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadAllClips, estimateTotalDuration } from '@/lib/services/video-agent/video-composer'
import { concatenateVideosWithShotstack } from '@/lib/services/video-agent/processors/shotstack-composer'
import type { VideoClip, TransitionConfig, MusicConfig } from '@/lib/types/video-agent'
import { generateSRTFromShots } from '@/lib/services/video-agent/subtitle-generator'
import { generateNarrationBatch } from '@/lib/services/kie-ai/elevenlabs-tts'
import type { Database } from '@/lib/database.types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

/**
 * 开始合成最终视频
 * POST /api/video-agent/projects/[id]/compose
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
      console.error('[Video Agent] ❌ Project not found', { projectError })
      return NextResponse.json(
        { error: 'Project not found or access denied', code: 'PROJECT_NOT_FOUND' },
        { status: 404 }
      )
    }

    // 检查是否已完成视频生成 (Step 4)
    if (!project.step_4_status || project.step_4_status !== 'completed') {
      console.error('[Video Agent] Videos not ready', {
        step_4_status: project.step_4_status,
        current_step: project.current_step
      })
      return NextResponse.json(
        { error: 'Videos must be generated first', code: 'VIDEOS_NOT_READY' },
        { status: 400 }
      )
    }

    // 获取所有已完成的视频片段
    const { data: videoClips, error: clipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'success')  // 修复：使用 'success' 而不是 'completed'
      .order('shot_number', { ascending: true })
      .returns<ProjectVideoClip[]>()

    if (clipsError || !videoClips || videoClips.length === 0) {
      console.error('[Video Agent] ❌ No completed video clips found', {
        clipsError,
        videoClipsCount: videoClips?.length || 0
      })
      return NextResponse.json(
        { error: 'No completed video clips found', code: 'NO_CLIPS' },
        { status: 400 }
      )
    }

    // 获取分镜脚本以获取时长信息
    const { data: shots } = await supabaseAdmin
      .from('project_shots')
      .select('shot_number, duration_seconds')
      .eq('project_id', projectId)
      .order('shot_number', { ascending: true })
      .returns<Pick<ProjectShot, 'shot_number' | 'duration_seconds'>[]>()

    // 构建 VideoClip 对象
    const clips: VideoClip[] = videoClips.map(clip => {
      const shot = shots?.find(s => s.shot_number === clip.shot_number)
      return {
        shot_number: clip.shot_number,
        video_url: clip.video_url!,
        duration: shot?.duration_seconds || 5
      }
    })

    // 🔥 使用 Shotstack 云端 API 进行视频合成（无需 FFmpeg）

    // 更新项目状态为 processing
    const { error: updateError } = await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'processing',
        step_6_status: 'processing'  // Step 6（最终合成）
        // 不更新 current_step，由前端在用户点击"继续"时更新
      } as any)
      .eq('id', projectId)
      .returns<any>()

    if (updateError) {
      console.error('[Video Agent] ❌ Failed to update project status:', updateError)
      return NextResponse.json(
        {
          error: 'Failed to update project status',
          code: 'UPDATE_FAILED',
          details: process.env.NODE_ENV === 'development' ? updateError.message : undefined
        },
        { status: 500 }
      )
    }

    // 异步执行合成任务
    composeVideoAsync(projectId, clips, project).catch(error => {
      console.error('[Video Agent] ❌ Video composition failed:', error)

      // 更新项目状态为失败
      supabaseAdmin
        .from('video_agent_projects')
        .update({
          status: 'failed',
          step_6_status: 'failed'  // 修复：Step 6
        } as any)
        .eq('id', projectId)
        .returns<any>()
    })

    // 估算合成时长
    const estimatedDuration = estimateTotalDuration(clips)

    return NextResponse.json({
      success: true,
      data: {
        message: 'Video composition started',
        totalClips: clips.length,
        estimatedDuration,
        status: 'processing'
      }
    })

  } catch (error) {
    console.error('[Video Agent] ❌❌❌ Compose video error:', {
      error,
      message: (error as Error).message,
      stack: (error as Error).stack
    })
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to start video composition',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : 'Internal server error',
        code: 'COMPOSE_FAILED'
      },
      { status: 500 }
    )
  }
})

/**
 * 异步执行视频合成
 * @param projectId 项目 ID
 * @param clips 视频片段列表
 * @param project 项目数据
 */
async function composeVideoAsync(
  projectId: string,
  clips: VideoClip[],
  project: any
) {
  try {
    // 🔥 使用 Shotstack 云端拼接，无需下载视频到本地
    const videoUrls = clips.map(clip => clip.video_url)
    const clipDurations = clips.map(clip => clip.duration)

    // 🔥 步骤 1: 准备旁白音频和字幕（旁白模式）
    let subtitleUrl: string | undefined
    let narrationAudioClips: Array<{ url: string; start: number; length: number }> = []

    if (project.enable_narration) {
      try {
        // 获取分镜数据
        const { data: shots } = await supabaseAdmin
          .from('project_shots')
          .select('*')
          .eq('project_id', projectId)
          .order('shot_number', { ascending: true })
          .returns<ProjectShot[]>()

        if (shots && shots.length > 0) {
          // 1. 生成旁白音频
          const narrationTexts = shots.map(shot => shot.character_action)
          const narrationResults = await generateNarrationBatch(narrationTexts, {
            voice: 'Rachel',  // 默认音色，后续可配置
            speed: 1.0
          })

          // 构建音频 clips 数组
          let currentTime = 0
          for (let i = 0; i < shots.length; i++) {
            const result = narrationResults[i]
            if (result.success && result.audio_url) {
              narrationAudioClips.push({
                url: result.audio_url,
                start: currentTime,
                length: shots[i].duration_seconds
              })
            } else {
              console.error(`[Video Agent] ❌ Narration ${i + 1} failed:`, result.error)
            }
            currentTime += shots[i].duration_seconds
          }

          // 2. 生成 SRT 字幕文件
          const srtContent = generateSRTFromShots(shots)

          // 上传 SRT 到 Supabase Storage
          const bucketName = 'video-agent-files'
          const srtPath = `${projectId}/subtitles.srt`

          const { error: uploadError } = await supabaseAdmin
            .storage
            .from(bucketName)
            .upload(srtPath, srtContent, {
              contentType: 'text/plain',
              upsert: true
            })

          if (uploadError) {
            console.error('[Video Agent] ⚠️ Failed to upload SRT:', uploadError)
          } else {
            // 获取公开 URL
            const { data: urlData } = supabaseAdmin
              .storage
              .from(bucketName)
              .getPublicUrl(srtPath)

            subtitleUrl = urlData.publicUrl
          }
        }
      } catch (error) {
        console.error('[Video Agent] ⚠️ Failed to generate narration:', error)
        // 旁白失败不影响主流程
      }
    }

    // 🔥 步骤 2: 确定背景音乐 URL（非旁白模式 + 未静音）
    let backgroundMusicUrl: string | undefined

    if (!project.enable_narration && !project.mute_bgm) {
      // 🔥 统一使用预设背景音乐（不再使用 Suno）
      backgroundMusicUrl = 'https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/video-agent-files/preset-music/funny-comedy-cartoon.mp3'
    }

    // 🔥 步骤 3: 使用 Shotstack 拼接视频（一次性完成：视频拼接 + 旁白/音乐 + 字幕）
    const finalVideoUrl = await concatenateVideosWithShotstack(videoUrls, {
      aspectRatio: project.aspect_ratio || '16:9',
      clipDurations,
      backgroundMusicUrl,
      subtitleUrl,
      narrationAudioClips: narrationAudioClips.length > 0 ? narrationAudioClips : undefined
    })

    // 🔥 步骤 4: 更新项目状态为完成（Shotstack URL 直接可用）
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'completed',
        step_6_status: 'completed',
        final_video_url: finalVideoUrl,
        final_video_storage_path: `shotstack:${projectId}`,
        completed_at: new Date().toISOString()
      } as any)
      .eq('id', projectId)
      .returns<any>()
  } catch (error) {
    console.error('[Video Agent] ❌ Composition async error:', error)

    // 更新为失败状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'failed',
        step_6_status: 'failed'
      } as any)
      .eq('id', projectId)
      .returns<any>()

    throw error
  }
}
