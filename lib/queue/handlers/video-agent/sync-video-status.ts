import { Job } from 'bullmq'
import { supabaseAdmin } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'
import type { VideoAgentSyncVideoStatusJobData } from '@/lib/queue/types'

type ProjectVideoClip = Database['public']['Tables']['project_video_clips']['Row']

export async function handleVideoAgentSyncVideoStatus(job: Job): Promise<any> {
  const jobData = job.data as VideoAgentSyncVideoStatusJobData
  const projectId = jobData.projectId

  // IMPORTANT: handler must not import queue-manager (avoids circular deps).
  // Use BullMQ queue directly for follow-up jobs.
  const { Queue } = await import('bullmq')
  const { redisBullMQ } = await import('@/lib/redis-bullmq')
  const queueName = process.env.QUEUE_PREFIX || 'vidfab-video-processing'
  const queue = new Queue(queueName, { connection: redisBullMQ })

  await job.updateProgress({ percent: 5, message: 'Loading clips...' })

  const { data: clips, error: clipsError } = await supabaseAdmin
    .from('project_video_clips')
    .select('*')
    .eq('project_id', projectId)
    .order('shot_number', { ascending: true })
    .returns<ProjectVideoClip[]>()

  if (clipsError) {
    throw new Error(`Failed to load clips: ${clipsError.message}`)
  }

  const generating = (clips || []).filter(
    (c) => c.status === 'generating' && (c.video_request_id || c.seedance_task_id)
  )

  await job.updateProgress({ percent: 10, message: `Syncing ${generating.length} generating clips...` })

  let updated = 0
  for (let i = 0; i < generating.length; i++) {
    const clip = generating[i]
    const now = new Date().toISOString()

    // Veo3
    if (clip.video_request_id) {
      const { getVeo3VideoStatus } = await import('@/lib/services/video-agent/veo3-video-generator')
      const statusResult = await getVeo3VideoStatus(clip.video_request_id)

      if (statusResult.status === 'completed' && statusResult.videoUrl) {
        await supabaseAdmin
          .from('project_video_clips')
          .update({
            status: 'success',
            video_url: statusResult.videoUrl,
            video_url_external: statusResult.videoUrl,
            storage_status: 'pending',
            updated_at: now,
          } as any)
          .eq('id', clip.id)

        // Enqueue download (idempotent jobId) - never download inside sync.
        await queue.add(
          'video_clip_download',
          {
            type: 'video_clip_download',
            jobId: `va:clip:download:${projectId}:${clip.shot_number}`,
            userId: jobData.userId,
            videoId: projectId,
            projectId,
            shotNumber: clip.shot_number,
            externalUrl: statusResult.videoUrl,
            createdAt: now,
          } as any,
          {
            jobId: `va:clip:download:${projectId}:${clip.shot_number}`,
            priority: 3,
            attempts: 6,
            backoff: { type: 'exponential', delay: 10000 },
            removeOnComplete: 50,
            removeOnFail: 20,
          }
        )

        updated++
      } else if (statusResult.status === 'failed') {
        await supabaseAdmin
          .from('project_video_clips')
          .update({ status: 'failed', error_message: statusResult.error || 'Video generation failed', updated_at: now } as any)
          .eq('id', clip.id)
        updated++
      }
    }

    // BytePlus
    if (clip.seedance_task_id) {
      const { checkVideoStatus } = await import('@/lib/services/byteplus/video/seedance-api')
      const statusResult = await checkVideoStatus(clip.seedance_task_id)
      const status = statusResult?.data?.status

      if (status === 'completed') {
        const videoUrl = statusResult?.data?.outputs?.[0] || null
        await supabaseAdmin
          .from('project_video_clips')
          .update({
            status: 'success',
            video_url: videoUrl,
            video_url_external: videoUrl,
            storage_status: videoUrl ? 'pending' : null,
            updated_at: now,
          } as any)
          .eq('id', clip.id)

        if (videoUrl) {
          await queue.add(
            'video_clip_download',
            {
              type: 'video_clip_download',
              jobId: `va:clip:download:${projectId}:${clip.shot_number}`,
              userId: jobData.userId,
              videoId: projectId,
              projectId,
              shotNumber: clip.shot_number,
              externalUrl: videoUrl,
              createdAt: now,
            } as any,
            {
              jobId: `va:clip:download:${projectId}:${clip.shot_number}`,
              priority: 3,
              attempts: 6,
              backoff: { type: 'exponential', delay: 10000 },
              removeOnComplete: 50,
              removeOnFail: 20,
            }
          )
        }
        updated++
      } else if (status === 'failed') {
        await supabaseAdmin
          .from('project_video_clips')
          .update({ status: 'failed', error_message: statusResult?.data?.error || 'Video generation failed', updated_at: now } as any)
          .eq('id', clip.id)
        updated++
      }
    }

    await job.updateProgress({
      percent: 10 + Math.round(((i + 1) / Math.max(1, generating.length)) * 85),
      message: `Synced ${i + 1}/${generating.length}`,
    })
  }

  const { data: refreshed } = await supabaseAdmin
    .from('project_video_clips')
    .select('status')
    .eq('project_id', projectId)
    .returns<Array<Pick<ProjectVideoClip, 'status'>>>()

  const statuses = (refreshed || []).map((c) => c.status)
  const doneCount = statuses.filter((s) => s === 'success' || s === 'failed').length
  if (statuses.length > 0 && doneCount === statuses.length) {
    await supabaseAdmin
      .from('video_agent_projects')
      .update({ step_4_status: 'completed' } as any)
      .eq('id', projectId)
  }

  await job.updateProgress({ percent: 100, message: 'Sync completed' })
  return { synced: true, updated }
}
