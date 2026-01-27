import { Job } from 'bullmq'

export async function handleVideoClipDownload(job: Job): Promise<any> {
  const { VideoAgentStorageManager } = await import('@/lib/services/video-agent/storage-manager')
  const jobData = job.data as import('@/lib/queue/types').VideoClipDownloadJobData

  console.log('[Queue] Starting video clip download', {
    projectId: jobData.projectId,
    shotNumber: jobData.shotNumber,
  })

  await job.updateProgress({ percent: 10, message: `Downloading video clip shot ${jobData.shotNumber}...` })

  const result = await VideoAgentStorageManager.downloadAndStoreVideoClip(
    jobData.userId,
    jobData.projectId,
    jobData.shotNumber,
    jobData.externalUrl
  )

  await job.updateProgress({ percent: 100, message: 'Download completed' })

  console.log('[Queue] Video clip download completed', {
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
