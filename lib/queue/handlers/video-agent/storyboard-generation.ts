import { Job } from 'bullmq'

export async function handleStoryboardGeneration(job: Job): Promise<any> {
  const { batchGenerateStoryboardsWithProgress, IMAGE_STYLES } = await import(
    '@/lib/services/video-agent/storyboard-generator'
  )
  const jobData = job.data as import('@/lib/queue/types').StoryboardGenerationJobData

  console.log('[Queue] Starting storyboard generation', {
    projectId: jobData.projectId,
    shotCount: jobData.shots.length,
  })

  const style = (IMAGE_STYLES as any)[jobData.style] || (IMAGE_STYLES as any)['realistic']

  const result = await batchGenerateStoryboardsWithProgress(
    jobData.projectId,
    jobData.shots as any,
    jobData.characters as any,
    style,
    jobData.aspectRatio,
    (progress) => {
      job
        .updateProgress({
          percent: progress.percent,
          message: progress.message,
          processed: progress.completed,
          total: progress.total,
        })
        .catch(console.error)
    }
  )

  console.log('[Queue] Storyboard generation completed', {
    projectId: jobData.projectId,
    result,
  })

  // 生成完成后，立即为所有成功且未上传的分镜图入队下载任务。
  // 必须在 generation handler 里做，而不是在路由层提前入队——
  // 路由层入队时生成还未开始，查不到任何 success 记录。
  try {
    const { supabaseAdmin } = await import('@/lib/supabase')
    const { videoQueueManager } = await import('@/lib/queue/queue-manager')

    const { data: storyboards } = await supabaseAdmin
      .from('project_storyboards')
      .select('id, shot_number, image_url_external, storage_status')
      .eq('project_id', jobData.projectId)
      .eq('status', 'success')
      .eq('is_current', true)
      .returns<any[]>()

    const toDownload = (storyboards || []).filter(
      (sb) =>
        (sb.storage_status === 'pending' || !sb.storage_status) &&
        typeof sb.image_url_external === 'string' &&
        sb.image_url_external.length > 0
    )

    if (toDownload.length > 0) {
      await Promise.allSettled(
        toDownload.map((sb) =>
          videoQueueManager.addJob(
            'storyboard_download',
            {
              jobId: `storyboard_download_${jobData.projectId}_${sb.shot_number}_${sb.id}`,
              userId: jobData.userId,
              videoId: jobData.projectId,
              projectId: jobData.projectId,
              shotNumber: sb.shot_number,
              storyboardId: sb.id,
              externalUrl: sb.image_url_external,
              createdAt: new Date().toISOString(),
            } as any,
            { priority: 'low', attempts: 3, removeOnComplete: true, removeOnFail: false }
          )
        )
      )
      console.log(`[Queue] Enqueued ${toDownload.length} storyboard download jobs for project ${jobData.projectId}`)
    }
  } catch (downloadQueueErr) {
    // 入队失败不影响生成结果，cron job 会兜底
    console.error('[Queue] Failed to enqueue storyboard downloads after generation:', downloadQueueErr)
  }

  return {
    generated: true,
    projectId: jobData.projectId,
    total: result.total,
    completed: result.completed,
    failed: result.failed,
    finalStatus: result.finalStatus,
  }
}
