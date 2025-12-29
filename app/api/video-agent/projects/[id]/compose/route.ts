/**
 * Video Agent - 视频合成 API
 * POST: 开始合成最终视频 (步骤 6 - Final Composition)
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadAllClips, estimateTotalDuration } from '@/lib/services/video-agent/video-composer'
import { simpleConcatVideos, addBackgroundMusic, checkFfmpegAvailable, addSubtitlesToVideo, addAudioToVideo, concatenateWithCrossfadeAndAudio } from '@/lib/services/video-agent/processors/ffmpeg'
import type { VideoClip, TransitionConfig, MusicConfig } from '@/lib/types/video-agent'
import { sunoAPI } from '@/lib/services/suno/suno-api'
import { generateSRTFromShots } from '@/lib/services/video-agent/subtitle-generator'
import { generateNarration, ELEVENLABS_VOICES } from '@/lib/services/kie-ai/elevenlabs-tts'
import path from 'path'
import fs from 'fs'
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
    console.log('[Video Agent] 🎬 Compose API called', { projectId, userId })

    // 验证项目所有权
    const { data: project, error: projectError } = await supabaseAdmin
      .from('video_agent_projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .single<VideoAgentProject>()

    console.log('[Video Agent] 📊 Project query result', {
      found: !!project,
      error: projectError?.message,
      step_4_status: project?.step_4_status,
      current_step: project?.current_step
    })

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

    console.log('[Video Agent] Starting video composition', {
      projectId,
      hasMusic: !!project.music_url,
      transitionEffect: project.transition_effect
    })

    // 获取所有已完成的视频片段
    console.log('[Video Agent] 📹 Querying video clips...')
    const { data: videoClips, error: clipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'success')  // 修复：使用 'success' 而不是 'completed'
      .order('shot_number', { ascending: true })
      .returns<ProjectVideoClip[]>()

    console.log('[Video Agent] 📹 Video clips query result', {
      clipsError: clipsError?.message,
      clipsCount: videoClips?.length || 0,
      clipStatuses: videoClips?.map(c => ({ shot: c.shot_number, status: c.status, hasUrl: !!c.video_url }))
    })

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

    // 🔥 检查 FFmpeg 是否可用（使用 roomx-ai 的实现方式）
    console.log('[Video Agent] 🎞️ Checking FFmpeg availability...')
    let ffmpegAvailable = false
    try {
      ffmpegAvailable = await checkFfmpegAvailable()
      console.log('[Video Agent] 🎞️ FFmpeg check result:', { available: ffmpegAvailable })
    } catch (ffmpegError) {
      console.error('[Video Agent] ❌ FFmpeg check failed:', ffmpegError)
      return NextResponse.json(
        {
          error: 'FFmpeg check failed',
          code: 'FFMPEG_CHECK_FAILED',
          details: process.env.NODE_ENV === 'development' ? (ffmpegError as Error).message : undefined
        },
        { status: 500 }
      )
    }

    if (!ffmpegAvailable) {
      console.error('[Video Agent] ❌ FFmpeg not available')
      return NextResponse.json(
        {
          error: 'FFmpeg not available',
          code: 'FFMPEG_NOT_AVAILABLE',
          details: 'Please ensure FFmpeg is installed on the server'
        },
        { status: 500 }
      )
    }

    // 更新项目状态为 processing
    console.log('[Video Agent] 💾 Updating project status to processing...')
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

    console.log('[Video Agent] ✅ Project status updated, starting async composition...')

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
    console.log('[Video Agent] ⏱️ Estimating composition duration...')
    const estimatedDuration = estimateTotalDuration(clips)

    console.log('[Video Agent] ✅ Compose API returning success', {
      totalClips: clips.length,
      estimatedDuration
    })

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
  const tempDir = `/tmp/video-agent/${projectId}`
  const outputPath = path.join(tempDir, 'final_video.mp4')

  try {
    console.log('[Video Agent] Downloading video clips...')

    // 步骤 1: 下载所有视频片段
    const clipsWithPaths = await downloadAllClips(clips, tempDir)

    console.log('[Video Agent] All clips downloaded, starting composition...')

    // 步骤 1.5: 🔥 旁白模式 - 为每个片段生成并混入旁白音频
    let clipsForConcat = clipsWithPaths
    if (project.enable_narration) {
      console.log('[Video Agent] 🎤 Generating narration audio for all clips...')

      // 获取分镜数据（用于生成旁白文本）
      const { data: shotsData } = await supabaseAdmin
        .from('project_shots')
        .select('*')
        .eq('project_id', projectId)
        .order('shot_number', { ascending: true })
        .returns<ProjectShot[]>()

      if (shotsData && shotsData.length > 0) {
        const clipsWithNarration = []

        for (let i = 0; i < clipsWithPaths.length; i++) {
          const clip = clipsWithPaths[i]
          const clipPath = clip.local_path  // 🔥 修复：获取字符串路径，而不是整个对象
          const shot = shotsData.find(s => s.shot_number === clips[i].shot_number)

          if (!shot) {
            console.warn(`[Video Agent] ⚠️ No shot data for clip ${clips[i].shot_number}, skipping narration`)
            clipsWithNarration.push(clip)  // 🔥 修复：推入完整的 clip 对象
            continue
          }

          try {
            // 使用 character_action 作为旁白文本
            const narrationText = shot.character_action || shot.description
            console.log(`[Video Agent] 🎤 Generating narration ${i + 1}/${clipsWithPaths.length}:`, {
              shotNumber: shot.shot_number,
              textLength: narrationText.length
            })

            // 生成旁白音频（使用 Kie.ai ElevenLabs TTS）
            const narrationResult = await generateNarration({
              text: narrationText,
              voice: 'Rachel',  // 专业、清晰的女声
              speed: 1.0,
              stability: 0.5,
              similarity_boost: 0.75
            })

            if (!narrationResult.success) {
              throw new Error(narrationResult.error || 'Narration generation failed')
            }

            // 下载旁白音频
            const narrationPath = path.join(tempDir, `narration_${shot.shot_number}.mp3`)
            const fetch = (await import('node-fetch')).default
            const narrationResponse = await fetch(narrationResult.audio_url)
            const narrationBuffer = await narrationResponse.buffer()
            fs.writeFileSync(narrationPath, narrationBuffer)

            // 将旁白音频混入视频
            const videoWithNarrationPath = path.join(tempDir, `clip_${shot.shot_number}_with_narration.mp4`)
            if (!clipPath) {
              throw new Error(`Clip ${shot.shot_number} has no local_path`)
            }
            await addAudioToVideo(clipPath, narrationPath, videoWithNarrationPath, {
              volume: 1.0  // 旁白音量 100%
            })

            // 🔥 修复：推入更新了 local_path 的 clip 对象（指向带旁白的视频）
            clipsWithNarration.push({
              ...clip,
              local_path: videoWithNarrationPath
            })
            console.log(`[Video Agent] 🎤 Narration added to clip ${shot.shot_number} ✓`)

          } catch (narrationError) {
            console.error(`[Video Agent] ⚠️ Failed to add narration to clip ${clips[i].shot_number}:`, narrationError)
            // 旁白失败：为视频添加静音音频轨道（确保所有视频都有音频）
            try {
              const clipPath = clip.local_path
              const videoWithSilentAudioPath = path.join(tempDir, `clip_${clips[i].shot_number}_with_silent_audio.mp4`)

              // 使用 FFmpeg 添加静音音频轨道
              const { addSilentAudioTrack } = await import('@/lib/services/video-agent/processors/ffmpeg')
              if (!clipPath) {
                throw new Error(`Clip ${clips[i].shot_number} has no local_path`)
              }
              await addSilentAudioTrack(clipPath, videoWithSilentAudioPath)

              clipsWithNarration.push({
                ...clip,
                local_path: videoWithSilentAudioPath
              })
              console.log(`[Video Agent] 🔇 Added silent audio track to clip ${clips[i].shot_number}`)
            } catch (silentAudioError) {
              console.error(`[Video Agent] ❌ Failed to add silent audio to clip ${clips[i].shot_number}:`, silentAudioError)
              // 最后fallback：使用原视频
              clipsWithNarration.push(clip)
            }
          }
        }

        clipsForConcat = clipsWithNarration
        console.log('[Video Agent] 🎤 Narration audio generation completed')
      } else {
        console.warn('[Video Agent] ⚠️ No shots data found, skipping narration')
      }
    }

    // 步骤 2: 拼接视频（使用带旁白的视频片段，添加过渡效果）
    const videoPaths = clipsForConcat.map(clip => clip.local_path!).filter(Boolean)
    console.log('[Video Agent] 🎬 Concatenating videos with crossfade transitions', {
      clipCount: videoPaths.length,
      transitionDuration: 0.5
    })

    // 使用带过渡效果的拼接函数（0.5 秒交叉淡化过渡）
    const segmentDuration = Math.max(...clipsForConcat.map(c => c.duration_seconds || 5))
    await concatenateWithCrossfadeAndAudio(videoPaths, outputPath, 0.5, segmentDuration)

    let finalVideoPath = outputPath

    // 步骤 3: 🔥 检查 Suno 音乐生成状态并添加背景音乐（仅非旁白模式且未静音 BGM）
    let musicUrl = project.music_url

    // 旁白模式或静音 BGM 时不添加背景音乐
    if (project.enable_narration || project.mute_bgm) {
      if (project.enable_narration) {
        console.log('[Video Agent] 🎵 Skipping background music (narration mode enabled)', { projectId })
      } else if (project.mute_bgm) {
        console.log('[Video Agent] 🎵 Skipping background music (BGM muted)', { projectId })
      }
      musicUrl = null
    }
    // 如果有 Suno task ID，检查音乐是否生成完成
    else if (project.suno_task_id && !musicUrl) {
      try {
        console.log('[Video Agent] 🎵 Checking Suno music generation status...', {
          sunoTaskId: project.suno_task_id
        })

        const sunoStatus = await sunoAPI.getStatus(project.suno_task_id)

        if (sunoStatus.status === 'completed' && sunoStatus.audio_url) {
          musicUrl = sunoStatus.audio_url
          console.log('[Video Agent] 🎵 Suno music ready, using generated music')

          // 更新数据库中的 music_url
          await supabaseAdmin
            .from('video_agent_projects')
            .update({
              music_url: musicUrl,
              updated_at: new Date().toISOString()
            } as any)
            .eq('id', projectId)
            .returns<any>()
        } else if (sunoStatus.status === 'processing' || sunoStatus.status === 'submitted') {
          console.log('[Video Agent] 🎵 Suno music still generating, waiting...')

          // 等待音乐生成完成（最多等待 3 分钟）
          const completedStatus = await sunoAPI.waitForCompletion(project.suno_task_id, {
            maxAttempts: 36,
            intervalMs: 5000
          })

          if (completedStatus.status === 'completed' && completedStatus.audio_url) {
            musicUrl = completedStatus.audio_url
            console.log('[Video Agent] 🎵 Suno music generation completed')

            await supabaseAdmin
              .from('video_agent_projects')
              .update({
                music_url: musicUrl,
                updated_at: new Date().toISOString()
              } as any)
              .eq('id', projectId)
              .returns<any>()
          } else {
            console.warn('[Video Agent] ⚠️ Suno music generation failed or timed out')
          }
        } else {
          console.warn('[Video Agent] ⚠️ Suno music generation failed:', sunoStatus.error_message)
        }
      } catch (error) {
        console.error('[Video Agent] ⚠️ Failed to check Suno status (non-critical):', error)
        // 继续处理，不影响视频合成
      }
    }

    // 添加背景音乐 (如果有)
    if (musicUrl) {
      console.log('[Video Agent] Adding background music...')

      const musicPath = path.join(tempDir, 'background_music.mp3')
      const outputWithMusic = path.join(tempDir, 'final_video_with_music.mp4')

      // 下载音乐文件
      const fetch = (await import('node-fetch')).default
      const musicResponse = await fetch(musicUrl)
      const musicBuffer = await musicResponse.buffer()
      fs.writeFileSync(musicPath, musicBuffer)

      // 计算视频总时长（所有片段时长之和）
      const videoDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)
      console.log(`[Video Agent] 视频总时长: ${videoDuration} 秒`)

      const musicConfig: MusicConfig = {
        url: musicUrl,
        volume: 0.3,
        fadeIn: 1,
        fadeOut: 2
      }

      await addBackgroundMusic(outputPath, musicPath, outputWithMusic, musicConfig, videoDuration)

      finalVideoPath = outputWithMusic
    }

    // 步骤 4: 🔥 添加字幕（如果启用了旁白模式）
    if (project.enable_narration) {
      try {
        console.log('[Video Agent] 🔠 Adding subtitles...')

        // 获取分镜数据（用于生成字幕）
        const { data: shotsData } = await supabaseAdmin
          .from('project_shots')
          .select('*')
          .eq('project_id', projectId)
          .order('shot_number', { ascending: true })
          .returns<ProjectShot[]>()

        if (shotsData && shotsData.length > 0) {
          // 生成 SRT 字幕内容
          const srtContent = generateSRTFromShots(shotsData, {
            useCharacterAction: true  // 使用 character_action 作为字幕文本
          })

          // 保存 SRT 文件
          const srtPath = path.join(tempDir, 'subtitles.srt')
          fs.writeFileSync(srtPath, srtContent, 'utf-8')

          console.log('[Video Agent] 🔠 SRT file generated:', srtPath)

          // 将字幕烧录到视频中
          const videoWithSubsPath = path.join(tempDir, 'final_video_with_subs.mp4')
          await addSubtitlesToVideo(finalVideoPath, srtPath, videoWithSubsPath, {
            fontSize: 16,  // 🔥 调整字号（从 28 改为 16，更适合 1080p 视频）
            outline: 2,    // 🔥 减小描边（从 3 改为 2）
            shadow: 1      // 🔥 减小阴影（从 2 改为 1）
          })

          finalVideoPath = videoWithSubsPath
          console.log('[Video Agent] 🔠 Subtitles added successfully ✓')
        } else {
          console.warn('[Video Agent] ⚠️ No shots data found, skipping subtitles')
        }
      } catch (subtitleError) {
        console.error('[Video Agent] ⚠️ Failed to add subtitles (non-critical):', subtitleError)
        // 字幕添加失败不影响视频合成，继续处理
      }
    }

    console.log('[Video Agent] Video composition completed:', finalVideoPath)

    // 步骤 5: 上传到 Supabase Storage
    const finalVideoBuffer = fs.readFileSync(finalVideoPath)
    const storagePath = `video-agent/${projectId}/final_video_${Date.now()}.mp4`

    // 使用 videos bucket，如果不存在则创建
    const bucketName = 'videos'

    // 检查并创建 bucket
    const { data: buckets } = await supabaseAdmin.storage.listBuckets()
    const bucketExists = buckets?.some(b => b.name === bucketName)

    if (!bucketExists) {
      console.log(`[Video Agent] Creating ${bucketName} bucket...`)
      const { error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: true
        // 不设置 fileSizeLimit 和 allowedMimeTypes，使用默认值（避免超过免费版限制）
      })

      if (createError) {
        console.error('[Video Agent] Failed to create bucket:', createError)
        throw new Error(`Failed to create storage bucket: ${createError.message}`)
      }
      console.log(`[Video Agent] Bucket ${bucketName} created successfully`)
    }

    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from(bucketName)
      .upload(storagePath, finalVideoBuffer, {
        contentType: 'video/mp4',
        upsert: false
      })

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`)
    }

    // 获取公开 URL
    const { data: urlData } = supabaseAdmin
      .storage
      .from(bucketName)
      .getPublicUrl(storagePath)

    const finalVideoUrl = urlData.publicUrl

    // 步骤 5: 更新项目状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'completed',
        step_6_status: 'completed',  // 修复：Step 6
        final_video_url: finalVideoUrl,
        final_video_storage_path: storagePath,
        final_video_file_size: finalVideoBuffer.length,
        final_video_resolution: '1080p',
        completed_at: new Date().toISOString()
      } as any)
      .eq('id', projectId)
      .returns<any>()

    console.log('[Video Agent] Project completed successfully:', {
      projectId,
      finalVideoUrl
    })

    // 清理临时文件
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

  } catch (error) {
    console.error('[Video Agent] Composition async error:', error)

    // 更新为失败状态
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'failed',
        step_6_status: 'failed'  // 修复：Step 6
      } as any)
      .eq('id', projectId)
      .returns<any>()

    // 清理临时文件
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    throw error
  }
}
