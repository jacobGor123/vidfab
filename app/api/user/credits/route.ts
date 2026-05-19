/**
 * 简单的用户积分API（参考iMideo模式）
 * 只返回基本的积分信息，不做复杂检查
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { supabaseAdmin, TABLES } from "@/lib/supabase"
import { ensureMonthlyCreditsCurrent } from "@/lib/subscription/credit-buckets"
import { getEffectiveEntitlements } from "@/lib/subscription/entitlements"

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      console.error('❌ Authentication failed: No session or user')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const sessionUser = session.user as typeof session.user & { id?: string }

    console.log('🔍 Session Debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userUuid: sessionUser.uuid,
      userId: sessionUser.id,
      userEmail: sessionUser.email
    })

    // 获取用户ID
    let userId = sessionUser.uuid || sessionUser.id

    if (!userId) {
      console.error('❌ Authentication failed: User UUID/ID missing')
      return NextResponse.json(
        { success: false, error: "User UUID missing" },
        { status: 401 }
      )
    }

    // 🔥 强制刷新查询用户积分信息（避免缓存问题）
    const { data: user, error } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('credits_remaining, credits_monthly_total, credits_monthly_balance, credits_other_balance, credits_last_reset_date, credits_next_reset_at, subscription_plan, subscription_status, subscription_stripe_id, subscription_period_end, updated_at')
      .eq('uuid', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Database error:', error)
      throw error
    }

    // 如果用户不存在，返回默认值
    if (!user) {
      return NextResponse.json({
        success: true,
        data: {
          credits: 0,
          is_pro: false,
          is_recharged: false,
          plan_type: 'free',
          subscription: null
        }
      })
    }

    const refreshedCredits = await ensureMonthlyCreditsCurrent(userId)
    const entitlements = getEffectiveEntitlements(user)
    const credits = refreshedCredits?.total ?? (user.credits_remaining || 0)
    const monthlyTotal = refreshedCredits?.hasPaidAccess ? refreshedCredits.monthlyTotal : null
    const monthlyAvailable = refreshedCredits?.hasPaidAccess ? refreshedCredits.monthlyBalance : null
    const monthlyUsed =
      refreshedCredits?.hasPaidAccess ? refreshedCredits.monthlyUsed : null
    const otherCredits = refreshedCredits?.otherBalance ?? Math.max(0, credits - (monthlyAvailable || 0))
    const plan = user.subscription_plan || 'free'
    const status = user.subscription_status || 'inactive'
    const is_pro = entitlements.hasPaidAccess

    // 🔥 Debug用户订阅状态
    console.log('🔍 User Subscription Debug:', {
      userId,
      rawUser: user,
      credits,
      plan,
      status,
      is_pro,
      logic: `plan(${plan}) !== 'free' && credits(${credits}) > 0 = ${is_pro}`
    })

    return NextResponse.json({
      success: true,
      data: {
        credits: credits,
        monthly_total: monthlyTotal,
        monthly_available: monthlyAvailable,
        monthly_used: monthlyUsed,
        other_credits: otherCredits,
        last_reset_on: refreshedCredits?.hasPaidAccess ? refreshedCredits.lastResetAt : null,
        next_reset_on: refreshedCredits?.hasPaidAccess ? refreshedCredits.nextResetAt : null,
        is_pro: is_pro,
        is_recharged: credits > 0,
        plan_type: plan,
        subscription: is_pro ? { status, plan } : null
      }
    })

  } catch (error) {
    console.error("❌ User credits API error:", error)

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user credits"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json(
    { success: false, error: "Method not allowed" },
    { status: 405 }
  )
}
