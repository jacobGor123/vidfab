/**
 * Video Agent 脚本创建次数配额管理
 *
 * 核心流程：
 * 1. 获取用户订阅等级和当月使用次数
 * 2. 判断是否在免费配额内
 * 3. 如果在配额内：增加计数，不扣积分
 * 4. 如果超配额：检查并扣除 3 积分，增加计数
 * 5. 返回结果
 */

import { supabaseAdmin, TABLES } from '@/lib/supabase'
import { deductUserCredits } from '@/lib/simple-credits-check'
import { ensureMonthlyCreditsCurrent } from '@/lib/subscription/credit-buckets'
import { getUserEntitlements } from '@/lib/subscription/entitlements'
import type { PlanId } from '@/lib/subscription/types'

/**
 * 月度免费脚本创建配额
 */
export const SCRIPT_CREATION_QUOTAS: Record<PlanId, number> = {
  free: 5,
  pro: 20,
  premium: 50
}

/**
 * 超额时每次创建消耗的积分
 */
export const OVERAGE_CREDITS_PER_SCRIPT = 3

/**
 * 检查结果
 */
export interface ScriptCreationCheckResult {
  canAfford: boolean
  withinQuota: boolean          // 是否在免费配额内
  currentUsage: number          // 当前已使用次数
  monthlyQuota: number          // 月度配额
  creditsDeducted: number       // 扣除的积分数（0 或 3）
  creditsRemaining: number      // 剩余积分
  error?: string
  details?: {
    month: string
    planId: PlanId
    message?: string
  }
}

/**
 * 获取当前月份（YYYY-MM 格式）
 */
function getCurrentMonth(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

/**
 * 获取用户的月度配额
 */
export function getMonthlyQuota(planId: PlanId | null): number {
  if (!planId) return SCRIPT_CREATION_QUOTAS.free
  return SCRIPT_CREATION_QUOTAS[planId] || SCRIPT_CREATION_QUOTAS.free
}

/**
 * 获取用户当月使用次数
 * 如果记录不存在，返回 0
 */
export async function getCurrentUsage(userId: string, month: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from(TABLES.SCRIPT_CREATION_USAGE)
    .select('count')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  if (error || !data) {
    return 0
  }

  return data.count || 0
}

/**
 * 增加用户当月使用次数
 * 使用 UPSERT 模式（不存在则创建，存在则更新）
 */
async function incrementUsage(userId: string, month: string): Promise<boolean> {
  // 先尝试查询现有记录
  const { data: existing } = await supabaseAdmin
    .from(TABLES.SCRIPT_CREATION_USAGE)
    .select('id, count')
    .eq('user_id', userId)
    .eq('month', month)
    .single()

  if (existing) {
    // 更新现有记录
    const { error } = await supabaseAdmin
      .from(TABLES.SCRIPT_CREATION_USAGE)
      .update({ count: existing.count + 1 })
      .eq('id', existing.id)

    if (error) {
      console.error('[ScriptQuota] Failed to update usage:', error)
      return false
    }
  } else {
    // 创建新记录
    const { error } = await supabaseAdmin
      .from(TABLES.SCRIPT_CREATION_USAGE)
      .insert({
        user_id: userId,
        month: month,
        count: 1
      })

    if (error) {
      console.error('[ScriptQuota] Failed to insert usage:', error)
      return false
    }
  }

  return true
}

/**
 * 检查并处理脚本创建配额
 * 核心函数：检查配额，必要时扣除积分，更新使用次数
 *
 * @param userId 用户UUID
 * @returns 检查结果
 */
export async function checkAndDeductScriptCreation(
  userId: string
): Promise<ScriptCreationCheckResult> {
  const month = getCurrentMonth()

  // 1. 获取用户信息（订阅等级和积分）
  const { data: user, error: userError } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('subscription_plan, credits_remaining')
    .eq('uuid', userId)
    .single()

  if (userError || !user) {
    return {
      canAfford: false,
      withinQuota: false,
      currentUsage: 0,
      monthlyQuota: 0,
      creditsDeducted: 0,
      creditsRemaining: 0,
      error: 'Failed to fetch user information',
      details: {
        month,
        planId: 'free',
        message: 'User not found'
      }
    }
  }

  const refreshedCredits = await ensureMonthlyCreditsCurrent(userId)
  const entitlements = await getUserEntitlements(userId)
  const planId = entitlements.effectivePlan
  const userCredits = refreshedCredits?.total ?? (user.credits_remaining || 0)
  const monthlyQuota = getMonthlyQuota(planId)

  // 2. 获取当月使用次数
  const currentUsage = await getCurrentUsage(userId, month)

  console.log('[ScriptQuota] Check:', {
    userId,
    month,
    planId,
    currentUsage,
    monthlyQuota,
    userCredits
  })

  // 3. 判断是否在免费配额内
  const withinQuota = currentUsage < monthlyQuota

  if (withinQuota) {
    // 🎉 在配额内：直接增加计数，不扣积分
    const success = await incrementUsage(userId, month)

    if (!success) {
      // ⚠️ 配额跟踪失败，但不阻止用户操作（只是记录警告）
      console.warn('[ScriptQuota] ⚠️ Failed to update usage count, but allowing operation to continue')
    }

    console.log('[ScriptQuota] ✅ Within quota, no credits deducted')

    return {
      canAfford: true,
      withinQuota: true,
      currentUsage: success ? currentUsage + 1 : currentUsage,
      monthlyQuota,
      creditsDeducted: 0,
      creditsRemaining: userCredits,
      details: {
        month,
        planId,
        message: success
          ? `Used ${currentUsage + 1}/${monthlyQuota} free scripts this month`
          : `Within quota (usage tracking unavailable)`
      }
    }
  }

  // 4. 超额：需要扣除积分
  if (userCredits < OVERAGE_CREDITS_PER_SCRIPT) {
    return {
      canAfford: false,
      withinQuota: false,
      currentUsage,
      monthlyQuota,
      creditsDeducted: 0,
      creditsRemaining: userCredits,
      error: `You've used all ${monthlyQuota} free scripts this month. ${OVERAGE_CREDITS_PER_SCRIPT} credits are required for additional scripts, but you only have ${userCredits}.`,
      details: {
        month,
        planId,
        message: 'Quota exceeded and insufficient credits'
      }
    }
  }

  // 5. 扣除积分
  const deductResult = await deductUserCredits(userId, OVERAGE_CREDITS_PER_SCRIPT)

  if (!deductResult.success) {
    return {
      canAfford: false,
      withinQuota: false,
      currentUsage,
      monthlyQuota,
      creditsDeducted: 0,
      creditsRemaining: userCredits,
      error: deductResult.error || 'Failed to deduct credits',
      details: { month, planId }
    }
  }

  // 6. 增加使用计数
  const success = await incrementUsage(userId, month)

  if (!success) {
    // 计数失败，但积分已扣除（这是个边界情况，应该记录日志）
    console.error('[ScriptQuota] ⚠️ Credits deducted but usage count failed to update')
  }

  console.log('[ScriptQuota] ✅ Overage: deducted 3 credits')

  return {
    canAfford: true,
    withinQuota: false,
    currentUsage: currentUsage + 1,
    monthlyQuota,
    creditsDeducted: OVERAGE_CREDITS_PER_SCRIPT,
    creditsRemaining: deductResult.newBalance || 0,
    details: {
      month,
      planId,
      message: `Used ${currentUsage + 1} scripts this month (${monthlyQuota} free + overage at 3 credits each)`
    }
  }
}

/**
 * 获取用户脚本创建配额状态（不扣除，仅查询）
 * 用于前端显示"剩余 X/Y 次免费创建"
 */
export async function getScriptCreationQuotaStatus(userId: string): Promise<{
  planId: PlanId
  monthlyQuota: number
  currentUsage: number
  remainingFree: number
  month: string
}> {
  const month = getCurrentMonth()

  const entitlements = await getUserEntitlements(userId)
  const planId = entitlements.effectivePlan
  const monthlyQuota = getMonthlyQuota(planId)

  // 获取当月使用次数
  const currentUsage = await getCurrentUsage(userId, month)
  const remainingFree = Math.max(0, monthlyQuota - currentUsage)

  return {
    planId,
    monthlyQuota,
    currentUsage,
    remainingFree,
    month
  }
}
