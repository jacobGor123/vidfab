/**
 * 简化的积分检查工具（服务器端）
 * 用于替代复杂的CreditsManager，提供简单可靠的积分验证
 */

import { supabaseAdmin, TABLES } from "@/lib/supabase"
import { calculateRequiredCredits, type VideoModel } from "@/lib/credits-calculator"
import { isMissingColumnError } from "@/lib/supabase-schema-compat"

// 图片生成固定消耗 3 积分
export const IMAGE_GENERATION_CREDITS = 3

interface SimpleCreditCheckResult {
  success: boolean
  canAfford: boolean
  userCredits: number
  requiredCredits: number
  remainingCredits: number
  error?: string
}

interface AtomicCreditsResult {
  success: boolean
  new_balance?: number
  error?: string
}

function parseAtomicCreditsResult(data: unknown): AtomicCreditsResult {
  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Invalid credits RPC response' }
  }

  const result = data as Record<string, unknown>
  return {
    success: result.success === true,
    new_balance: typeof result.new_balance === 'number' ? result.new_balance : undefined,
    error: typeof result.error === 'string' ? result.error : undefined,
  }
}

async function deductUserCreditsFallback(
  userUuid: string,
  creditsToDeduct: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  // 先获取当前积分
  let hasCreditBucketColumns = true
  let { data: user, error: fetchError } = await supabaseAdmin
    .from(TABLES.USERS)
    .select('credits_remaining, credits_monthly_balance, credits_other_balance')
    .eq('uuid', userUuid)
    .single()

  if (isMissingColumnError(fetchError)) {
    hasCreditBucketColumns = false
    const legacyResult = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    user = legacyResult.data as any
    fetchError = legacyResult.error
  }

  if (fetchError) {
    console.error('❌ Failed to fetch user credits for deduction:', fetchError)
    return { success: false, error: 'Failed to fetch user credits' }
  }

  const currentCredits = user?.credits_remaining || 0
  const currentMonthly = hasCreditBucketColumns ? Math.max(0, user?.credits_monthly_balance || 0) : 0
  const currentOther = hasCreditBucketColumns ? Math.max(0, user?.credits_other_balance || 0) : currentCredits

  // 检查积分是否足够
  if (currentCredits < creditsToDeduct) {
    return {
      success: false,
      error: 'Insufficient credits',
      newBalance: currentCredits
    }
  }

  const monthlySpent = Math.min(currentMonthly, creditsToDeduct)
  const otherSpent = creditsToDeduct - monthlySpent
  const newMonthly = currentMonthly - monthlySpent
  const newOther = Math.max(0, currentOther - otherSpent)
  const newBalance = newMonthly + newOther

  // 更新用户积分
  const updatePayload = hasCreditBucketColumns
    ? {
        credits_monthly_balance: newMonthly,
        credits_other_balance: newOther,
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      }
    : {
        credits_remaining: newBalance,
        updated_at: new Date().toISOString(),
      }

  const { error: updateError } = await supabaseAdmin
    .from(TABLES.USERS)
    .update(updatePayload)
    .eq('uuid', userUuid)

  if (updateError) {
    console.error('❌ Failed to update user credits:', updateError)
    return { success: false, error: 'Failed to update credits' }
  }

  return {
    success: true,
    newBalance
  }
}

/**
 * 简单的积分检查函数（服务器端）
 * @param userUuid 用户UUID
 * @param model 视频模型
 * @param resolution 分辨率
 * @param duration 时长
 * @returns 积分检查结果
 */
export async function checkUserCredits(
  userUuid: string,
  model: VideoModel,
  resolution: string,
  duration: string,
  audio?: boolean
): Promise<SimpleCreditCheckResult> {
  try {
    // 计算所需积分
    const requiredCredits = calculateRequiredCredits(model, resolution, duration, audio)

    // 查询用户当前积分
    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    if (error) {
      console.error('❌ Failed to fetch user credits:', error)
      return {
        success: false,
        canAfford: false,
        userCredits: 0,
        requiredCredits,
        remainingCredits: 0,
        error: 'Failed to fetch user credits'
      }
    }

    const userCredits = user?.credits_remaining || 0
    const canAfford = userCredits >= requiredCredits
    const remainingCredits = Math.max(0, userCredits - requiredCredits)

    return {
      success: true,
      canAfford,
      userCredits,
      requiredCredits,
      remainingCredits
    }
  } catch (error) {
    console.error('❌ Credits check error:', error)
    return {
      success: false,
      canAfford: false,
      userCredits: 0,
      requiredCredits: calculateRequiredCredits(model, resolution, duration, audio),
      remainingCredits: 0,
      error: 'Credits check failed'
    }
  }
}

/**
 * 简单的积分扣除函数（服务器端）
 * @param userUuid 用户UUID
 * @param creditsToDeduct 要扣除的积分
 * @returns 是否扣除成功
 */
export async function deductUserCredits(
  userUuid: string,
  creditsToDeduct: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    if (creditsToDeduct < 0) {
      return refundUserCredits(userUuid, Math.abs(creditsToDeduct))
    }

    if (creditsToDeduct === 0) {
      const { data: user } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('credits_remaining')
        .eq('uuid', userUuid)
        .single()

      return { success: true, newBalance: user?.credits_remaining || 0 }
    }

    const { data, error } = await supabaseAdmin.rpc('deduct_user_credits_atomic', {
      p_user_uuid: userUuid,
      p_credits: creditsToDeduct,
      p_description: 'Credits spent for generation',
      p_metadata: {},
    })

    if (error) {
      console.warn('⚠️ deduct_user_credits_atomic RPC unavailable or failed, using fallback:', error.message)
      return deductUserCreditsFallback(userUuid, creditsToDeduct)
    }

    const result = parseAtomicCreditsResult(data)
    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to deduct credits',
        newBalance: result.new_balance,
      }
    }

    console.log(`✅ Successfully deducted ${creditsToDeduct} credits from user ${userUuid}. New balance: ${result.new_balance}`)

    return {
      success: true,
      newBalance: result.new_balance
    }
  } catch (error) {
    console.error('❌ Credits deduction error:', error)
    return {
      success: false,
      error: 'Credits deduction failed'
    }
  }
}

/**
 * 退款积分（生成失败时退回）
 * @param userUuid 用户UUID
 * @param creditsToRefund 要退还的积分
 * @returns 是否退款成功
 */
export async function refundUserCredits(
  userUuid: string,
  creditsToRefund: number
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  try {
    if (creditsToRefund <= 0) {
      return { success: false, error: 'Refund credits must be positive' }
    }

    const { data, error } = await supabaseAdmin.rpc('add_user_credits_atomic', {
      p_user_uuid: userUuid,
      p_credits: creditsToRefund,
      p_transaction_type: 'refunded',
      p_description: 'Credits refunded after failed generation',
      p_metadata: {},
    })

    if (error) {
      console.warn('⚠️ add_user_credits_atomic RPC unavailable or failed, using fallback:', error.message)
      let hasCreditBucketColumns = true
      let { data: user, error: fetchError } = await supabaseAdmin
        .from(TABLES.USERS)
        .select('credits_remaining, credits_monthly_balance, credits_monthly_total, credits_other_balance')
        .eq('uuid', userUuid)
        .single()

      if (isMissingColumnError(fetchError)) {
        hasCreditBucketColumns = false
        const legacyResult = await supabaseAdmin
          .from(TABLES.USERS)
          .select('credits_remaining')
          .eq('uuid', userUuid)
          .single()

        user = legacyResult.data as any
        fetchError = legacyResult.error
      }

      if (fetchError) {
        console.error('❌ Failed to fetch user credits for refund:', fetchError)
        return { success: false, error: 'Failed to fetch user credits' }
      }

      const currentCredits = user?.credits_remaining || 0
      const currentMonthly = hasCreditBucketColumns ? Math.max(0, user?.credits_monthly_balance || 0) : 0
      const monthlyTotal = hasCreditBucketColumns ? Math.max(0, user?.credits_monthly_total || 0) : 0
      const currentOther = hasCreditBucketColumns ? Math.max(0, user?.credits_other_balance || 0) : currentCredits
      const monthlySpace = Math.max(0, monthlyTotal - currentMonthly)
      const toMonthly = Math.min(monthlySpace, creditsToRefund)
      const newMonthly = currentMonthly + toMonthly
      const newOther = currentOther + (creditsToRefund - toMonthly)
      const newBalance = newMonthly + newOther

      const updatePayload = hasCreditBucketColumns
        ? {
            credits_monthly_balance: newMonthly,
            credits_other_balance: newOther,
            credits_remaining: newBalance,
            updated_at: new Date().toISOString(),
          }
        : {
            credits_remaining: newBalance,
            updated_at: new Date().toISOString(),
          }

      const { error: updateError } = await supabaseAdmin
        .from(TABLES.USERS)
        .update(updatePayload)
        .eq('uuid', userUuid)

      if (updateError) {
        console.error('❌ Failed to refund user credits:', updateError)
        return { success: false, error: 'Failed to refund credits' }
      }

      console.log(`✅ Refunded ${creditsToRefund} credits to user ${userUuid}. New balance: ${newBalance}`)
      return { success: true, newBalance }
    }

    const result = parseAtomicCreditsResult(data)
    if (!result.success) {
      return { success: false, error: result.error || 'Failed to refund credits', newBalance: result.new_balance }
    }

    console.log(`✅ Refunded ${creditsToRefund} credits to user ${userUuid}. New balance: ${result.new_balance}`)
    return { success: true, newBalance: result.new_balance }
  } catch (error) {
    console.error('❌ Credits refund error:', error)
    return { success: false, error: 'Credits refund failed' }
  }
}

/**
 * 图片生成积分检查（服务器端）
 * @param userUuid 用户UUID
 * @returns 积分检查结果
 */
export async function checkImageGenerationCredits(
  userUuid: string
): Promise<SimpleCreditCheckResult> {
  try {
    const requiredCredits = IMAGE_GENERATION_CREDITS

    // 查询用户当前积分
    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    if (error) {
      console.error('❌ Failed to fetch user credits for image generation:', error)
      return {
        success: false,
        canAfford: false,
        userCredits: 0,
        requiredCredits,
        remainingCredits: 0,
        error: 'Failed to fetch user credits'
      }
    }

    const userCredits = user?.credits_remaining || 0
    const canAfford = userCredits >= requiredCredits
    const remainingCredits = Math.max(0, userCredits - requiredCredits)

    return {
      success: true,
      canAfford,
      userCredits,
      requiredCredits,
      remainingCredits
    }
  } catch (error) {
    console.error('❌ Image generation credits check error:', error)
    return {
      success: false,
      canAfford: false,
      userCredits: 0,
      requiredCredits: IMAGE_GENERATION_CREDITS,
      remainingCredits: 0,
      error: 'Credits check failed'
    }
  }
}
