import { Job } from 'bullmq'
import { supabaseAdmin } from '@/lib/supabase'
import { estimateTotalDuration } from '@/lib/services/video-agent/video-composer'
import { concatenateVideosWithShotstack } from '@/lib/services/video-agent/processors/shotstack-composer'
import { generateSRTFromShots } from '@/lib/services/video-agent/subtitle-generator'
import { generateNarrationBatch } from '@/lib/services/kie-ai/elevenlabs-tts'
import type { Database } from '@/lib/database.types'
import type { VideoAgentComposeJobData } from '@/lib/queue/types'

type VideoAgentProject = Database['public']['Tables']['video_agent_projects']['Row']
type ProjectShot = Database['public']['Tables']['project_shots']['Row']
type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

export async function handleVideoAgentCompose(job: Job): Promise<any> {
  const jobData = job.data as VideoAgentComposeJobData
  const projectId = jobData.projectId

  await job.updateProgress({ percent: 5, message: 'Loading project...' })

  const { data: project, error: projectError } = await supabaseAdmin
    .from('video_agent_projects')
    .select('*')
    .eq('id', projectId)
    .single<VideoAgentProject>()

  if (projectError || !project) {
    throw new Error(`Project not found: ${projectError?.message || 'unknown error'}`)
  }

  if (project.step_4_status !== 'completed') {
    throw new Error(`Videos not ready (step_4_status=${project.step_4_status})`)
  }

  await supabaseAdmin
    .from('video_agent_projects')
    .update({ status: 'processing', step_6_status: 'processing' } as any)
    .eq('id', projectId)

  await job.updateProgress({ percent: 10, message: 'Loading clips...' })

  const { data: videoClips, error: clipsError } = await supabaseAdmin
    .from('project_video_clips')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'success')
    .order('shot_number', { ascending: true })
    .returns<ProjectVideoClip[]>()

  if (clipsError || !videoClips || videoClips.length === 0) {
    throw new Error('No completed video clips found')
  }

  const { data: shots } = await supabaseAdmin
    .from('project_shots')
    .select('*')
    .eq('project_id', projectId)
    .order('shot_number', { ascending: true })
    .returns<ProjectShot[]>()

  const clipDurations = (shots || []).map((s) => s.duration_seconds || 5)
  const videoUrls = videoClips
    .map((c) => c.cdn_url || c.video_url_external || c.video_url)
    .filter(Boolean) as string[]

  if (videoUrls.length !== videoClips.length) {
    throw new Error('Some clips are missing URLs')
  }

  const estimatedDuration = estimateTotalDuration(
    videoUrls.map((url, idx) => ({ shot_number: idx + 1, video_url: url, duration: clipDurations[idx] || 5 }))
  )

  await job.updateProgress({ percent: 20, message: 'Preparing narration/subtitles...' })

  let subtitleUrl: string | undefined
  let narrationAudioClips: Array<{ url: string; start: number; length: number }> = []

  if ((project as any).enable_narration) {
    try {
      const narrationTexts = (shots || []).map((s) => String(s.character_action || ''))
      const narrationResults = await generateNarrationBatch(narrationTexts, {
        voice: 'Rachel',
        speed: 1.0,
      })

      let currentTime = 0
      for (let i = 0; i < (shots || []).length; i++) {
        const result = narrationResults[i]
        if (result?.success && result.audio_url) {
          narrationAudioClips.push({
            url: result.audio_url,
            start: currentTime,
            length: (shots || [])[i].duration_seconds || 5,
          })
        }
        currentTime += (shots || [])[i].duration_seconds || 5
      }

      const srtContent = generateSRTFromShots(shots || [])
      const bucketName = 'video-agent-files'
      const srtPath = `${projectId}/subtitles.srt`

      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(srtPath, srtContent, { contentType: 'text/plain', upsert: true })

      if (!uploadError) {
        const { data: urlData } = supabaseAdmin.storage.from(bucketName).getPublicUrl(srtPath)
        subtitleUrl = urlData.publicUrl
      }
    } catch {
      // Narration/subtitle failure should not fail compose.
    }
  }

  let backgroundMusicUrl: string | undefined
  if (!(project as any).enable_narration && !(project as any).mute_bgm) {
    backgroundMusicUrl =
      'https://ycahbhhuzgixfrljtqmi.supabase.co/storage/v1/object/public/video-agent-files/preset-music/funny-comedy-cartoon.mp3'
  }

  await job.updateProgress({ percent: 40, message: 'Submitting Shotstack render...' })

  const videoMetadata = await concatenateVideosWithShotstack(videoUrls, {
    aspectRatio: ((project as any).aspect_ratio || '16:9') as any,
    clipDurations,
    backgroundMusicUrl,
    subtitleUrl,
    narrationAudioClips: narrationAudioClips.length > 0 ? (narrationAudioClips as any) : undefined,
  })

  await job.updateProgress({ percent: 95, message: 'Saving final video metadata...' })

  // 🔥 重要：确保数据库更新成功，否则会导致"Job finished but status not updated"错误
  const maxRetries = 3
  let updateSuccess = false
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { error: updateError } = await supabaseAdmin
        .from('video_agent_projects')
        .update({
          status: 'completed',
          step_6_status: 'completed',
          final_video_url: videoMetadata.url,
          final_video_file_size: videoMetadata.fileSize,
          final_video_resolution: videoMetadata.resolution,
          final_video_storage_path: `shotstack:${projectId}`,
          completed_at: new Date().toISOString(),
        } as any)
        .eq('id', projectId)

      if (updateError) {
        throw new Error(`Database update failed: ${updateError.message}`)
      }

      // 验证更新是否真的生效
      const { data: verifyProject } = await supabaseAdmin
        .from('video_agent_projects')
        .select('step_6_status, final_video_url')
        .eq('id', projectId)
        .single()

      if (!verifyProject || verifyProject.step_6_status !== 'completed') {
        throw new Error('Database update verification failed')
      }

      updateSuccess = true
      console.log(`✅ [Compose] Database updated successfully for project ${projectId}`)
      break

    } catch (err) {
      lastError = err as Error
      console.error(`❌ [Compose] Database update attempt ${attempt}/${maxRetries} failed:`, err)

      if (attempt < maxRetries) {
        // 指数退避：1s, 2s, 4s
        const delayMs = 1000 * Math.pow(2, attempt - 1)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
    }
  }

  if (!updateSuccess) {
    throw new Error(
      `Failed to update database after ${maxRetries} attempts: ${lastError?.message}. ` +
      `Video rendered successfully (${videoMetadata.url}) but status not saved.`
    )
  }

  await job.updateProgress({ percent: 100, message: 'Compose completed' })

  return { composed: true, estimatedDuration, video: videoMetadata }
}
