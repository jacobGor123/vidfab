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

  return {
    generated: true,
    projectId: jobData.projectId,
    total: result.total,
    completed: result.completed,
    failed: result.failed,
    finalStatus: result.finalStatus,
  }
}
