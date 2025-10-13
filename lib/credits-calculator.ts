/**
 * VidFab项目积分计算工具
 * 使用当前项目的真实积分配置，与pricing-config.ts保持一致
 */

export type VideoModel = "vidfab-q1" | "vidfab-pro" | "video-effects" | "seedance-v1-pro-t2v" | "veo3-fast"

// 积分消耗配置 - 与 pricing-config.ts 保持一致
const CREDITS_CONSUMPTION = {
  // Seedance模型消耗 (对应前端的vidfab-q1)
  'seedance-v1-pro-t2v': {
    '480p-5s': 10,
    '480p-10s': 20,
    '720p-5s': 20,
    '720p-10s': 40,
    '1080p-5s': 40,
    '1080p-10s': 80
  },
  // Veo3高级模型 (对应前端的vidfab-pro)
  'veo3-fast': {
    '720p-5s': 70,
    '720p-8s': 100,
    '720p-10s': 130,
    '1080p-5s': 90,
    '1080p-8s': 130,
    '1080p-10s': 170
  },
  // 视频特效
  'video-effects': {
    '5s': 30
  }
} as const

/**
 * 计算视频生成所需积分
 * @param model 视频模型
 * @param resolution 分辨率
 * @param duration 时长（秒）
 * @returns 所需积分数
 */
export function calculateRequiredCredits(
  model: VideoModel,
  resolution: string,
  duration: string
): number {
  const durationNum = parseInt(duration) || 5
  const durationStr = `${durationNum}s`

  // 映射前端模型名称到积分配置名称
  let mappedModel: keyof typeof CREDITS_CONSUMPTION

  if (model === "vidfab-q1" || model === "seedance-v1-pro-t2v") {
    mappedModel = "seedance-v1-pro-t2v"
  } else if (model === "vidfab-pro" || model === "veo3-fast") {
    mappedModel = "veo3-fast"
  } else if (model === "video-effects") {
    mappedModel = "video-effects"
  } else {
    // 默认使用seedance模型
    mappedModel = "seedance-v1-pro-t2v"
  }

  // 查找积分消耗配置
  const modelConfig = CREDITS_CONSUMPTION[mappedModel]

  if (mappedModel === "video-effects") {
    // 视频特效固定5秒，消耗30积分
    return modelConfig['5s'] || 30
  }

  // 构建查找键
  const lookupKey = `${resolution}-${durationStr}` as keyof typeof modelConfig
  const credits = modelConfig[lookupKey]

  if (credits) {
    return credits
  }

  // 如果没有找到确切匹配，提供合理默认值
  if (mappedModel === "seedance-v1-pro-t2v") {
    if (resolution === "480p") return durationNum === 5 ? 10 : 20
    if (resolution === "720p") return durationNum === 5 ? 20 : 40
    if (resolution === "1080p") return durationNum === 5 ? 40 : 80
    return 10 // 最基础默认值
  }

  if (mappedModel === "veo3-fast") {
    if (resolution === "720p") return durationNum <= 5 ? 70 : (durationNum <= 8 ? 100 : 130)
    if (resolution === "1080p") return durationNum <= 5 ? 90 : (durationNum <= 8 ? 130 : 170)
    return 70 // 默认值
  }

  return 10 // 最终默认值
}

/**
 * 检查用户积分是否足够
 * @param userCredits 用户积分余额
 * @param model 视频模型
 * @param resolution 分辨率
 * @param duration 时长
 * @returns 是否有足够积分
 */
export function hasEnoughCredits(
  userCredits: number,
  model: VideoModel,
  resolution: string,
  duration: string
): boolean {
  const required = calculateRequiredCredits(model, resolution, duration)
  return userCredits >= required
}

/**
 * 获取积分不足时的提示信息
 * @param userCredits 用户积分余额
 * @param requiredCredits 所需积分
 * @returns 提示信息
 */
export function getCreditInsufficientMessage(
  userCredits: number,
  requiredCredits: number
): string {
  const shortage = requiredCredits - userCredits
  return `Insufficient credits. You need ${shortage} more credits. Current balance: ${userCredits}, Required: ${requiredCredits}`
}

/**
 * 根据积分余额计算可以生成多少个视频
 * @param userCredits 用户积分余额
 * @param model 视频模型
 * @param resolution 分辨率
 * @param duration 时长
 * @returns 可生成视频数量
 */
export function calculatePossibleVideos(
  userCredits: number,
  model: VideoModel,
  resolution: string,
  duration: string
): number {
  const requiredPerVideo = calculateRequiredCredits(model, resolution, duration)
  return Math.floor(userCredits / requiredPerVideo)
}