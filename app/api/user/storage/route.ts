/**
 * User Storage API
 * 获取用户存储状态和执行存储清理的API端点
 * VidFab AI Video Platform
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { UnifiedStorageManager } from "@/lib/storage/unified-storage-manager"
import { ErrorReporter } from "@/lib/utils/error-handling"
import { supabaseAdmin } from "@/lib/supabase"

export async function GET(request: NextRequest) {
  try {
    // NextAuth 认证
    const session = await getServerSession(authConfig)

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

    // 获取用户订阅状态
    const { data: user } = await supabaseAdmin
      .from('users')
      .select('subscription_plan, subscription_status')
      .eq('uuid', userId)
      .single()

    let isSubscribed = false
    if (user) {
      const plan = user.subscription_plan || 'free'
      const status = user.subscription_status || 'inactive'
      isSubscribed = plan !== 'free' && status === 'active'
    }

    // 🔥 关键修复：在服务端环境调用存储管理器
    const storageStatus = await UnifiedStorageManager.getStorageStatus(userId, isSubscribed)

    return NextResponse.json({
      success: true,
      data: storageStatus
    })

  } catch (error) {
    console.error("❌ User storage API error:", error)
    ErrorReporter.getInstance().reportError(error, "User Storage API")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch storage status"
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // NextAuth 认证
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User UUID missing" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const action = body.action

    if (action === 'cleanup') {
      // 执行存储清理

      // 获取用户订阅状态
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('subscription_plan, subscription_status')
        .eq('uuid', userId)
        .single()

      let isSubscribed = false
      if (user) {
        const plan = user.subscription_plan || 'free'
        const status = user.subscription_status || 'inactive'
        isSubscribed = plan !== 'free' && status === 'active'
      }

      // 🔥 在服务端环境执行清理
      const cleanupResult = await UnifiedStorageManager.performStorageCleanup(userId, isSubscribed)

      return NextResponse.json({
        success: true,
        data: cleanupResult
      })
    }

    return NextResponse.json(
      { success: false, error: "Invalid action" },
      { status: 400 }
    )

  } catch (error) {
    console.error("❌ User storage cleanup API error:", error)
    ErrorReporter.getInstance().reportError(error, "User Storage Cleanup API")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to perform storage cleanup"
      },
      { status: 500 }
    )
  }
}