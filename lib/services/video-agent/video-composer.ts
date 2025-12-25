/**
 * Video Agent - Video Composer Service
 * 视频合成服务统一导出
 */

export { downloadVideo, downloadAllClips } from './video-downloader'
export { generateConcatFile, buildTransitionFilter, getResolutionParams } from './ffmpeg-config'
export { cleanupTempFiles, estimateTotalDuration } from './video-composer-utils'
export { composeVideo, composeVideoWithCrossfade } from './video-composition'
