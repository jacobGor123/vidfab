/**
 * User Quota API
 * 获取用户配额信息的API端点
 * VidFab AI Video Platform
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { UserVideosDB } from "@/lib/database/user-videos"
import { ErrorReporter } from "@/lib/utils/error-handling"

export async function GET(request: NextRequest) {
  try {
    // NextAuth 认证
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      console.error('❌ Authentication failed: No session or user')

      // 开发环境降级处理
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            current_videos: 0,
            max_videos: 999999,
            current_size_bytes: 0,
            max_size_bytes: 1073741824, // 1GB
            current_size_mb: 0,
            max_size_mb: 1024,
            videos_percentage: 0,
            storage_percentage: 0,
            can_upload: true,
            is_subscribed: false
          },
          dev_mode: true,
          message: "Authentication failed - returning default quota for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 获取用户ID
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      console.error('❌ Authentication failed: User UUID/ID missing', {
        userKeys: Object.keys(session.user || {}),
        userData: session.user
      })

      // 开发环境降级处理
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            current_videos: 0,
            max_videos: 999999,
            current_size_bytes: 0,
            max_size_bytes: 1073741824, // 1GB
            current_size_mb: 0,
            max_size_mb: 1024,
            videos_percentage: 0,
            storage_percentage: 0,
            can_upload: true,
            is_subscribed: false
          },
          dev_mode: true,
          message: "User UUID missing - returning default quota for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: "User UUID missing" },
        { status: 401 }
      )
    }

    // 🔥 关键修复：在服务端环境调用 getUserQuota
    // 这里 SUPABASE_SERVICE_ROLE_KEY 是可用的，不会出现 JWT 错误
    const quotaInfo = await UserVideosDB.getUserQuota(userId)

    return NextResponse.json({
      success: true,
      data: quotaInfo
    })

  } catch (error) {
    console.error("❌ User quota API error:", error)
    ErrorReporter.getInstance().reportError(error, "User Quota API")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user quota"
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