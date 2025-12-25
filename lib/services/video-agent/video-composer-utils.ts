/**
 * Video Agent - Video Composer Utilities
 * 视频合成工具函数
 */

import fs from 'fs'
import type { VideoClip, TransitionConfig } from '@/lib/types/video-agent'

/**
 * 清理临时文件
 * @param tempDir 临时目录
 */
export function cleanupTempFiles(tempDir: string = '/tmp/video-agent'): void {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true })
    console.log(`[VideoComposer] 临时文件已清理: ${tempDir}`)
  }
}

/**
 * 估算合成后的视频时长
 * @param clips 视频片段列表
 * @param transition 转场配置
 * @returns 总时长(秒)
 */
export function estimateTotalDuration(
  clips: VideoClip[],
  transition?: TransitionConfig
): number {
  const clipsDuration = clips.reduce((sum, clip) => sum + clip.duration, 0)

  // 如果有转场,需要减去重叠的时间
  if (transition && clips.length > 1) {
    const transitionOverlap = transition.duration * (clips.length - 1)
    return clipsDuration - transitionOverlap
  }

  return clipsDuration
}
