/**
 * Video Agent - 视频合成 API
 * POST: 开始合成最终视频 (步骤 6 - Final Composition)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { supabaseAdmin } from '@/lib/supabase'
import { downloadAllClips, estimateTotalDuration } from '@/lib/services/video-agent/video-composer'
import { simpleConcatVideos, addBackgroundMusic, checkFfmpegAvailable, addSubtitlesToVideo, addAudioToVideo } from '@/lib/services/video-agent/ffmpeg-executor'
import type { VideoClip, TransitionConfig, MusicConfig } from '@/lib/services/video-agent/video-composer'
import { sunoAPI } from '@/lib/services/suno/suno-api'
import { generateSRTFromShots } from '@/lib/services/video-agent/subtitle-generator'
import { generateNarration, ENGLISH_VOICES } from '@/lib/services/byteplus/audio/doubao-tts'
import path from 'path'
import fs from 'fs'

/**
 * 开始合成最终视频
 * POST /api/video-agent/projects/[id]/compose
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
    const { data: videoClips, error: clipsError } = await supabaseAdmin
      .from('project_video_clips')
      .select('*')
      .eq('project_id', projectId)
      .eq('status', 'success')  // 修复：使用 'success' 而不是 'completed'
      .order('shot_number', { ascending: true })

    if (clipsError || !videoClips || videoClips.length === 0) {
      console.error('[Video Agent] No completed video clips found', {
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

    // 构建 VideoClip 对象
    const clips: VideoClip[] = videoClips.map(clip => {
      const shot = shots?.find(s => s.shot_number === clip.shot_number)
      return {
        shot_number: clip.shot_number,
        video_url: clip.video_url!,
        duration: shot?.duration_seconds || 5
      }
    })

    // 检查 FFmpeg 是否可用
    const ffmpegAvailable = await checkFfmpegAvailable()

    if (!ffmpegAvailable) {
      console.error('[Video Agent] FFmpeg not available')
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
    await supabaseAdmin
      .from('video_agent_projects')
      .update({
        status: 'processing',
        step_6_status: 'processing'  // Step 6（最终合成）
        // 不更新 current_step，由前端在用户点击"继续"时更新
      })
      .eq('id', projectId)

    // 异步执行合成任务
    composeVideoAsync(projectId, clips, project).catch(error => {
      console.error('[Video Agent] Video composition failed:', error)

      // 更新项目状态为失败
      supabaseAdmin
        .from('video_agent_projects')
        .update({
          status: 'failed',
          step_6_status: 'failed'  // 修复：Step 6
        })
        .eq('id', projectId)
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
    console.error('[Video Agent] Compose video error:', error)
    return NextResponse.json(
      {
        error: 'Failed to start video composition',
        message: process.env.NODE_ENV === 'development'
          ? (error as Error).message
          : undefined
      },
      { status: 500 }
    )
  }
}

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

      if (shotsData && shotsData.length > 0) {
        const clipsWithNarration = []

        for (let i = 0; i < clipsWithPaths.length; i++) {
          const clipPath = clipsWithPaths[i]
          const shot = shotsData.find(s => s.shot_number === clips[i].shot_number)

          if (!shot) {
            console.warn(`[Video Agent] ⚠️ No shot data for clip ${clips[i].shot_number}, skipping narration`)
            clipsWithNarration.push(clipPath)
            continue
          }

          try {
            // 使用 character_action 作为旁白文本
            const narrationText = shot.character_action || shot.description
            console.log(`[Video Agent] 🎤 Generating narration ${i + 1}/${clipsWithPaths.length}:`, {
              shotNumber: shot.shot_number,
              textLength: narrationText.length
            })

            // 生成旁白音频
            const narrationResult = await generateNarration({
              text: narrationText,
              voice_type: ENGLISH_VOICES.en_us_female_1,  // 美式英语女声
              speed: 1.0,
              volume: 80,
              format: 'mp3'
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
            await addAudioToVideo(clipPath, narrationPath, videoWithNarrationPath, {
              volume: 1.0  // 旁白音量 100%
            })

            clipsWithNarration.push(videoWithNarrationPath)
            console.log(`[Video Agent] 🎤 Narration added to clip ${shot.shot_number} ✓`)

          } catch (narrationError) {
            console.error(`[Video Agent] ⚠️ Failed to add narration to clip ${clips[i].shot_number}:`, narrationError)
            // 旁白失败不影响视频合成，使用原视频
            clipsWithNarration.push(clipPath)
          }
        }

        clipsForConcat = clipsWithNarration
        console.log('[Video Agent] 🎤 Narration audio generation completed')
      } else {
        console.warn('[Video Agent] ⚠️ No shots data found, skipping narration')
      }
    }

    // 步骤 2: 拼接视频（使用带旁白的视频片段）
    await simpleConcatVideos(clipsForConcat, outputPath)

    let finalVideoPath = outputPath

    // 步骤 3: 🔥 检查 Suno 音乐生成状态并添加背景音乐（仅非旁白模式）
    let musicUrl = project.music_url

    // 旁白模式下不添加背景音乐
    if (project.enable_narration) {
      console.log('[Video Agent] 🎵 Skipping background music (narration mode enabled)', { projectId })
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
            })
            .eq('id', projectId)
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
              })
              .eq('id', projectId)
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
            fontSize: 28,
            outline: 3,
            shadow: 2
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
      })
      .eq('id', projectId)

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
      })
      .eq('id', projectId)

    // 清理临时文件
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }

    throw error
  }
}
