import { Job } from 'bullmq'

export async function handleStoryboardDownload(job: Job): Promise<any> {
  const { VideoAgentStorageManager } = await import('@/lib/services/video-agent/storage-manager')
  const jobData = job.data as import('@/lib/queue/types').StoryboardDownloadJobData

  // Batch mode: enqueue individual downloads for all successful, pending storyboards.
  // This keeps the worker-side download logic single-shot and avoids duplicating storage code.
  if (jobData.shotNumber === 0 || jobData.externalUrl === '__BATCH__') {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { videoQueueManager } = await import('@/lib/queue/queue-manager')

    console.log('[Queue] Starting storyboard download (batch)', {
      projectId: jobData.projectId,
    })

    const { data: storyboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('shot_number, image_url_external, status, storage_status')
      .eq('project_id', jobData.projectId)
      .returns<any[]>()

    const toDownload = (storyboards || [])
      .filter((sb) => sb?.status === 'success')
      .filter((sb) => sb?.storage_status === 'pending' || !sb?.storage_status)
      .filter((sb) => typeof sb?.image_url_external === 'string' && sb.image_url_external.length > 0)

    await job.updateProgress({ percent: 10, message: `Enqueuing ${toDownload.length} storyboard downloads...` })

    await Promise.allSettled(
      toDownload.map((sb) =>
        videoQueueManager.addJob(
          'storyboard_download',
          {
            jobId: `storyboard_download_${jobData.projectId}_${sb.shot_number}`,
            userId: jobData.userId,
            videoId: jobData.videoId,
            projectId: jobData.projectId,
            shotNumber: sb.shot_number,
            externalUrl: sb.image_url_external,
            createdAt: new Date().toISOString(),
          } as any,
          { priority: 'high', attempts: 3 }
        )
      )
    )

    await job.updateProgress({ percent: 100, message: 'Batch enqueue completed' })

    return {
      downloaded: false,
      batch: true,
      projectId: jobData.projectId,
      enqueued: toDownload.length,
    }
  }

  console.log('[Queue] Starting storyboard download', {
    projectId: jobData.projectId,
    shotNumber: jobData.shotNumber,
  })

  await job.updateProgress({ percent: 10, message: `Downloading storyboard shot ${jobData.shotNumber}...` })

  const result = await VideoAgentStorageManager.downloadAndStoreStoryboard(
    jobData.userId,
    jobData.projectId,
    jobData.shotNumber,
    jobData.externalUrl
  )

  await job.updateProgress({ percent: 100, message: 'Download completed' })

  console.log('[Queue] Storyboard download completed', {
    projectId: jobData.projectId,
    shotNumber: jobData.shotNumber,
    cdnUrl: result.cdnUrl,
  })

  return {
    downloaded: true,
    projectId: jobData.projectId,
    shotNumber: jobData.shotNumber,
    storagePath: result.storagePath,
    cdnUrl: result.cdnUrl,
    fileSize: result.fileSize,
  }
}
