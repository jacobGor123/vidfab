/**
 * User Videos API
 * 获取用户视频列表的API端点
 * VidFab AI Video Platform
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { UserVideosDB } from "@/lib/database/user-videos"
import { ErrorReporter } from "@/lib/utils/error-handling"

export async function GET(request: NextRequest) {
  try {
    // NextAuth 4.x 认证方式
    const session = await getServerSession(authConfig)


    if (!session?.user) {
      console.error('❌ Authentication failed: No session or user')

      // 🔥 开发环境降级处理 - 返回模拟数据用于测试
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            videos: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              hasMore: false
            }
          },
          dev_mode: true,
          message: "Authentication failed - returning empty data for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 🔥 修复：尝试多个可能的用户ID字段
    let userId = session.user.uuid || session.user.id

    if (!userId) {
      console.error('❌ Authentication failed: User UUID/ID missing', {
        userKeys: Object.keys(session.user || {}),
        userData: session.user
      })

      // 🔥 开发环境降级处理
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({
          success: true,
          data: {
            videos: [],
            pagination: {
              page: 1,
              limit: 20,
              total: 0,
              hasMore: false
            }
          },
          dev_mode: true,
          message: "User UUID missing - returning empty data for development testing"
        })
      }

      return NextResponse.json(
        { success: false, error: "User UUID missing" },
        { status: 401 }
      )
    }

    // userId already extracted above
    const { searchParams } = new URL(request.url)

    // 解析查询参数
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status")?.split(",") as any[]
    const orderBy = (searchParams.get("orderBy") || "created_at") as "created_at" | "updated_at"
    const orderDirection = (searchParams.get("orderDirection") || "desc") as "asc" | "desc"
    const search = searchParams.get("search") || undefined

    // 🔥 详细的调试日志
    console.log('🔍 [API] /api/user/videos called with:', {
      userId,
      email: session.user.email,
      page,
      limit,
      status,
      orderBy,
      orderDirection,
      search
    })

    // 参数验证
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      )
    }


    // 获取用户视频
    console.log('🔍 [API] Calling UserVideosDB.getUserVideos with userId:', userId)
    const result = await UserVideosDB.getUserVideos(userId, {
      page,
      limit,
      status,
      orderBy,
      orderDirection,
      search
    })

    console.log('🔍 [API] UserVideosDB.getUserVideos result:', {
      videoCount: result.videos.length,
      total: result.total,
      hasMore: result.hasMore,
      page: result.page,
      limit: result.limit
    })


    return NextResponse.json({
      success: true,
      data: {
        videos: result.videos,
        pagination: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          hasMore: result.hasMore
        }
      }
    })

  } catch (error) {
    console.error("❌ User videos API error:", error)
    ErrorReporter.getInstance().reportError(error, "User Videos API")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user videos"
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