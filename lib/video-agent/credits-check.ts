/**
 * Video Agent 统一的积分检查和扣除工具
 *
 * 核心流程:
 * 1. 获取用户当前积分
 * 2. 检查是否足够
 * 3. 立即扣除积分
 * 4. 返回结果
 */

import { deductUserCredits } from '@/lib/simple-credits-check'
import { supabaseAdmin, TABLES } from '@/lib/supabase'
import {
  CHARACTER_GENERATION_CREDITS,
  STORYBOARD_GENERATION_CREDITS,
  calculateVideoClipCredits,
  calculateBatchVideoCredits,
  VideoResolution
} from './credits-config'

export interface CreditCheckResult {
  canAfford: boolean
  userCredits: number
  requiredCredits: number
  remainingCredits: number
  error?: string
}

/**
 * 核心检查和扣除函数
 * @param userUuid 用户UUID
 * @param requiredCredits 所需积分
 * @param operation 操作名称(用于日志)
 * @returns 检查和扣除结果
 */
async function checkAndDeductCredits(
  userUuid: string,
  requiredCredits: number,
  operation: string
): Promise<CreditCheckResult> {
  // 1. 获取用户当前积分
  const { data: user, error } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('credits_remaining')
    .eq('uuid', userUuid)
    .single()

  if (error || !user) {
    return {
      canAfford: false,
      userCredits: 0,
      requiredCredits,
      remainingCredits: 0,
      error: 'Failed to fetch user credits'
    }
  }

  const userCredits = user.credits_remaining || 0

  // 2. 检查是否足够
  if (userCredits < requiredCredits) {
    return {
      canAfford: false,
      userCredits,
      requiredCredits,
      remainingCredits: userCredits,
      error: `Insufficient credits. You need ${requiredCredits} but only have ${userCredits}.`
    }
  }

  // 3. 立即扣除
  const deductResult = await deductUserCredits(userUuid, requiredCredits)

  if (!deductResult.success) {
    return {
      canAfford: false,
      userCredits,
      requiredCredits,
      remainingCredits: userCredits,
      error: deductResult.error || 'Failed to deduct credits'
    }
  }

  return {
    canAfford: true,
    userCredits,
    requiredCredits,
    remainingCredits: deductResult.newBalance || 0
  }
}

/**
 * 检查并扣除人物图初始批量生成积分
 * @param userUuid 用户UUID
 * @returns 检查和扣除结果
 */
export async function checkAndDeductCharacterInitialBatch(userUuid: string): Promise<CreditCheckResult> {
  return checkAndDeductCredits(userUuid, CHARACTER_GENERATION_CREDITS.INITIAL_BATCH, 'character_initial_batch')
}

/**
 * 检查并扣除人物图重新生成积分
 * @param userUuid 用户UUID
 * @param count 重新生成的人物数量
 * @returns 检查和扣除结果
 */
export async function checkAndDeductCharacterRegenerate(userUuid: string, count: number): Promise<CreditCheckResult> {
  const requiredCredits = CHARACTER_GENERATION_CREDITS.REGENERATE_PER_IMAGE * count
  return checkAndDeductCredits(userUuid, requiredCredits, 'character_regenerate')
}

/**
 * 检查并扣除分镜图生成积分
 * @param userUuid 用户UUID
 * @param count 分镜图数量
 * @returns 检查和扣除结果
 */
export async function checkAndDeductStoryboardGeneration(userUuid: string, count: number): Promise<CreditCheckResult> {
  const requiredCredits = STORYBOARD_GENERATION_CREDITS.PER_IMAGE * count
  return checkAndDeductCredits(userUuid, requiredCredits, 'storyboard_generation')
}

/**
 * 检查并扣除单个视频生成积分
 * @param userUuid 用户UUID
 * @param duration 视频时长(秒)
 * @param resolution 分辨率
 * @param useVeo3 是否使用 Veo3 模型
 * @returns 检查和扣除结果
 */
export async function checkAndDeductSingleVideo(
  userUuid: string,
  duration: number,
  resolution: VideoResolution,
  useVeo3: boolean = false
): Promise<CreditCheckResult> {
  const requiredCredits = calculateVideoClipCredits(duration, resolution, useVeo3)
  return checkAndDeductCredits(userUuid, requiredCredits, 'video_single')
}

/**
 * 检查并扣除批量视频生成积分
 * @param userUuid 用户UUID
 * @param shots 分镜列表
 * @param useVeo3 是否使用 Veo3 模型
 * @returns 检查和扣除结果
 */
export async function checkAndDeductBatchVideos(
  userUuid: string,
  shots: Array<{ duration_seconds?: number; resolution?: string }>,
  useVeo3: boolean = false
): Promise<CreditCheckResult> {
  const requiredCredits = calculateBatchVideoCredits(shots, useVeo3)
  return checkAndDeductCredits(userUuid, requiredCredits, 'video_batch')
}
