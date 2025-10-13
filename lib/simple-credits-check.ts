/**
 * 简化的积分检查工具（服务器端）
 * 用于替代复杂的CreditsManager，提供简单可靠的积分验证
 */

import { supabaseAdmin, TABLES } from "@/lib/supabase"
import { calculateRequiredCredits, type VideoModel } from "@/lib/credits-calculator"

interface SimpleCreditCheckResult {
  success: boolean
  canAfford: boolean
  userCredits: number
  requiredCredits: number
  remainingCredits: number
  error?: string
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
  duration: string
): Promise<SimpleCreditCheckResult> {
  try {
    // 计算所需积分
    const requiredCredits = calculateRequiredCredits(model, resolution, duration)

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
      requiredCredits: calculateRequiredCredits(model, resolution, duration),
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
    // 先获取当前积分
    const { data: user, error: fetchError } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining')
      .eq('uuid', userUuid)
      .single()

    if (fetchError) {
      console.error('❌ Failed to fetch user credits for deduction:', fetchError)
      return { success: false, error: 'Failed to fetch user credits' }
    }

    const currentCredits = user?.credits_remaining || 0

    // 检查积分是否足够
    if (currentCredits < creditsToDeduct) {
      return {
        success: false,
        error: 'Insufficient credits',
        newBalance: currentCredits
      }
    }

    const newBalance = currentCredits - creditsToDeduct

    // 更新用户积分
    const { error: updateError } = await supabaseAdmin
      .from(TABLES.USERS)
      .update({ credits_remaining: newBalance })
      .eq('uuid', userUuid)

    if (updateError) {
      console.error('❌ Failed to update user credits:', updateError)
      return { success: false, error: 'Failed to update credits' }
    }

    console.log(`✅ Successfully deducted ${creditsToDeduct} credits from user ${userUuid}. New balance: ${newBalance}`)

    return {
      success: true,
      newBalance
    }
  } catch (error) {
    console.error('❌ Credits deduction error:', error)
    return {
      success: false,
      error: 'Credits deduction failed'
    }
  }
}