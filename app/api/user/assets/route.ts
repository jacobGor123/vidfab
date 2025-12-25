/**
 * Unified User Assets API
 * 统一的用户资产API - 同时返回图片和视频
 * VidFab AI Video Platform
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { UserVideosDB } from "@/lib/database/user-videos"
import { supabaseAdmin, TABLES } from "@/lib/supabase"
import { ErrorReporter } from "@/lib/utils/error-handling"
import { mergeAssets } from "@/lib/types/asset"
import type { UserImage } from "@/lib/types/asset"

// 标记为动态路由
export const dynamic = 'force-dynamic'

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
            assets: [],
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

    // 获取用户ID
    const userId = session.user.uuid || session.user.id

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
            assets: [],
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

    // 解析查询参数
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const orderBy = (searchParams.get("orderBy") || "created_at") as "created_at" | "updated_at"
    const orderDirection = (searchParams.get("orderDirection") || "desc") as "asc" | "desc"
    const search = searchParams.get("search") || undefined

    console.log('🔍 [API] /api/user/assets called with:', {
      userId,
      email: session.user.email,
      page,
      limit,
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

    // 并行查询视频和图片
    // 注意：这里我们查询所有记录，然后在内存中排序和分页
    // 对于大量数据的场景，未来可以优化为数据库层面的 UNION 查询
    const [videosResult, imagesResult] = await Promise.all([
      // 查询用户所有视频（不分页）
      UserVideosDB.getUserVideos(userId, {
        page: 1,
        limit: 10000, // 足够大的数量
        orderBy,
        orderDirection,
        search
      }),
      // 查询用户所有已完成的图片（不分页）
      supabaseAdmin
        .from(TABLES.USER_IMAGES)
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .eq('status', 'completed')
        .order(orderBy, { ascending: orderDirection === 'asc' })
        .limit(10000) // 足够大的数量
    ])

    // 处理图片查询错误
    if (imagesResult.error) {
      console.error('❌ Error getting user images:', imagesResult.error)
      throw new Error(`Failed to fetch images: ${imagesResult.error.message}`)
    }

    const videos = videosResult.videos
    const images = (imagesResult.data || []) as UserImage[]

    console.log('🔍 [API] Query results:', {
      videosCount: videos.length,
      imagesCount: images.length
    })

    // 使用 mergeAssets 函数合并并排序
    // 注意：mergeAssets 内部会按 createdAt 排序，我们需要根据参数调整
    let allAssets = mergeAssets(videos, images)

    // 根据用户指定的排序参数重新排序
    if (orderBy === 'updated_at') {
      allAssets = allAssets.sort((a, b) => {
        const timeA = new Date(a.updatedAt).getTime()
        const timeB = new Date(b.updatedAt).getTime()
        return orderDirection === 'desc' ? timeB - timeA : timeA - timeB
      })
    } else if (orderDirection === 'asc') {
      // mergeAssets 默认是 created_at desc，如果需要 asc 则反转
      allAssets = allAssets.reverse()
    }

    // 应用搜索过滤（如果 mergeAssets 没有处理）
    // 注意：视频的搜索已经在 getUserVideos 中处理了，但图片没有
    if (search) {
      allAssets = allAssets.filter(asset =>
        asset.prompt.toLowerCase().includes(search.toLowerCase())
      )
    }

    // 计算分页
    const total = allAssets.length
    const from = (page - 1) * limit
    const to = from + limit
    const paginatedAssets = allAssets.slice(from, to)
    const hasMore = to < total

    console.log('🔍 [API] Pagination:', {
      total,
      page,
      limit,
      from,
      to,
      returning: paginatedAssets.length,
      hasMore
    })

    return NextResponse.json({
      success: true,
      data: {
        assets: paginatedAssets,
        pagination: {
          page,
          limit,
          total,
          hasMore
        }
      }
    })

  } catch (error) {
    console.error("❌ User assets API error:", error)
    ErrorReporter.getInstance().reportError(error, "User Assets API")

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user assets"
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
