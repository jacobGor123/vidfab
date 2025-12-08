/**
 * User Images API
 * 获取用户图片列表的API端点
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

// 标记为动态路由（使用 getServerSession 需要 headers）
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authConfig)

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    const userId = session.user.uuid || session.user.id

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "User UUID missing" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const orderBy = (searchParams.get("orderBy") || "created_at") as "created_at" | "updated_at"
    const orderDirection = (searchParams.get("orderDirection") || "desc") as "asc" | "desc"

    // 参数验证
    if (page < 1 || limit < 1 || limit > 100) {
      return NextResponse.json(
        { success: false, error: "Invalid pagination parameters" },
        { status: 400 }
      )
    }

    // 分页查询
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data: images, error, count } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('status', 'completed') // 只返回已完成的图片
      .order(orderBy, { ascending: orderDirection === 'asc' })
      .range(from, to)

    if (error) {
      console.error('Error getting user images:', error)
      return NextResponse.json(
        { success: false, error: "Failed to fetch images" },
        { status: 500 }
      )
    }

    const total = count || 0
    const hasMore = to < total - 1

    return NextResponse.json({
      success: true,
      data: {
        images: images || [],
        pagination: {
          page,
          limit,
          total,
          hasMore
        }
      }
    })

  } catch (error) {
    console.error("❌ User images API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch user images"
      },
      { status: 500 }
    )
  }
}
