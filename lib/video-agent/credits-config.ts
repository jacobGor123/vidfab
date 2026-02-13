/**
 * Video Agent 积分配置和计算函数
 *
 * 积分消耗规则:
 * - 初始人物图批量生成: 10积分(固定,不论人物数量)
 * - 人物图重新生成: 3积分/张
 * - 分镜图生成/重新生成: 3积分/张
 * - 分镜视频生成: 按实际秒数(2-10秒可变)+分辨率计算
 */

// 人物图生成积分
export const CHARACTER_GENERATION_CREDITS = {
  INITIAL_BATCH: 10,        // 初始批量固定10分
  REGENERATE_PER_IMAGE: 3   // 重新生成每张3分
} as const

// 分镜图生成积分
export const STORYBOARD_GENERATION_CREDITS = {
  PER_IMAGE: 3              // 每张3分
} as const

// 视频生成基准费率 (每秒积分)
// 基于现有 Seedance 规则反推:
// - Seedance 480p: 5s=10分, 10s=20分 → 2分/秒
// - Seedance 720p: 5s=20分, 10s=40分 → 4分/秒
// - Seedance 1080p: 5s=40分, 10s=80分 → 8分/秒
export const VIDEO_GENERATION_BASE_RATES = {
  '480p': 2,
  '720p': 4,
  '1080p': 8
} as const

// Veo3 模型费率 (如果使用 vidfab-pro)
export const VEO3_VIDEO_GENERATION_BASE_RATES = {
  '720p': 14,   // 70/5=14分/秒
  '1080p': 18   // 90/5=18分/秒
} as const

export type VideoResolution = '480p' | '720p' | '1080p'

/**
 * 计算单个视频片段积分
 * @param duration 视频时长(秒)
 * @param resolution 分辨率
 * @param useVeo3 是否使用 Veo3 模型
 * @returns 所需积分数
 */
export function calculateVideoClipCredits(
  duration: number,
  resolution: VideoResolution,
  useVeo3: boolean = false
): number {
  const rates = useVeo3 ? VEO3_VIDEO_GENERATION_BASE_RATES : VIDEO_GENERATION_BASE_RATES
  const baseRate = rates[resolution] || rates['720p'] // 默认720p
  return Math.ceil(baseRate * duration)
}

/**
 * 计算批量视频总积分
 * @param shots 分镜列表,包含时长和分辨率
 * @param useVeo3 是否使用 Veo3 模型
 * @returns 总积分数
 */
export function calculateBatchVideoCredits(
  shots: Array<{ duration_seconds?: number; resolution?: string }>,
  useVeo3: boolean = false
): number {
  return shots.reduce((total, shot) => {
    const duration = shot.duration_seconds || 5
    const res = (shot.resolution || '720p') as VideoResolution
    return total + calculateVideoClipCredits(duration, res, useVeo3)
  }, 0)
}

/**
 * 根据模型ID判断是否为 Veo3
 * @param modelId 模型ID (例如: vidfab-q1, vidfab-pro)
 * @returns 是否为 Veo3 模型
 */
export function isVeo3Model(modelId: string): boolean {
  return modelId === 'vidfab-pro'
}

/**
 * 获取默认分辨率
 * @param modelId 模型ID
 * @returns 默认分辨率
 */
export function getDefaultResolution(modelId: string): VideoResolution {
  // vidfab-pro (Veo3) 默认 1080p
  // vidfab-q1 默认 720p
  return modelId === 'vidfab-pro' ? '1080p' : '720p'
}
