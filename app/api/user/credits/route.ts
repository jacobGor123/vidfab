/**
 * 简单的用户积分API（参考iMideo模式）
 * 只返回基本的积分信息，不做复杂检查
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // 认证检查
    const session = await getServerSession(authConfig)

    console.log('🔍 Session Debug:', {
      hasSession: !!session,
      hasUser: !!session?.user,
      userUuid: session?.user?.uuid,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    })

    if (!session?.user) {
      console.error('❌ Authentication failed: No session or user')
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

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
      .select('credits_remaining, credits_monthly_total, subscription_plan, subscription_status, updated_at')
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

    // 🎯 简单的积分信息响应（参考iMideo格式）
    const credits = user.credits_remaining || 0
    const monthlyTotal = user.credits_monthly_total ?? null
    // 本月已消耗 = 月初拿到的总额 - 当前余额（非负）；累积场景下 monthlyTotal 可能含上月剩余
    const monthlyUsed =
      typeof monthlyTotal === 'number' ? Math.max(0, monthlyTotal - credits) : null
    const plan = user.subscription_plan || 'free'
    const status = user.subscription_status || 'inactive'
    // 🔥 修复：有积分且非free计划的用户都认为是Pro用户
    const is_pro = plan !== 'free' && credits > 0

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
        monthly_used: monthlyUsed,
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