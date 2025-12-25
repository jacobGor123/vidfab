/**
 * Video Agent - FFmpeg Configuration
 * FFmpeg 配置和滤镜构建
 */

import fs from 'fs'
import type { VideoClip, TransitionConfig } from '@/lib/types/video-agent'

/**
 * 生成 FFmpeg concat 文件列表
 * @param clips 带有本地路径的视频片段列表
 * @param outputPath 输出文件路径
 */
export function generateConcatFile(clips: VideoClip[], outputPath: string): void {
  const content = clips
    .map(clip => `file '${clip.local_path}'`)
    .join('\n')

  fs.writeFileSync(outputPath, content, 'utf-8')

  console.log(`[VideoComposer] Concat 文件已生成: ${outputPath}`)
}

/**
 * 构建 FFmpeg 转场滤镜
 * @param clipCount 视频片段数量
 * @param transition 转场配置
 * @returns FFmpeg 滤镜字符串
 */
export function buildTransitionFilter(
  clipCount: number,
  transition: TransitionConfig
): string {
  const { type, duration } = transition

  switch (type) {
    case 'fade':
      // 淡入淡出效果
      return `fade=t=in:st=0:d=${duration},fade=t=out:st=${duration}:d=${duration}`

    case 'crossfade':
      // 交叉溶解 - 需要复杂的滤镜链
      const xfadeFilters: string[] = []
      for (let i = 0; i < clipCount - 1; i++) {
        xfadeFilters.push(`[${i}:v][${i + 1}:v]xfade=transition=fade:duration=${duration}:offset=${i * 5}[v${i}]`)
      }
      return xfadeFilters.join(';')

    case 'slide':
      // 滑动切换
      return `xfade=transition=slideleft:duration=${duration}`

    case 'zoom':
      // 缩放切换
      return `xfade=transition=zoomin:duration=${duration}`

    default:
      return ''
  }
}

/**
 * 获取视频分辨率参数
 * @param resolution 分辨率字符串
 * @returns FFmpeg 分辨率参数
 */
export function getResolutionParams(resolution: string): { width: number; height: number } {
  const resolutionMap: Record<string, { width: number; height: number }> = {
    '480p': { width: 854, height: 480 },
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 }
  }

  return resolutionMap[resolution] || resolutionMap['1080p']
}
