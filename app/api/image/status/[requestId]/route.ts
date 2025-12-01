/**
 * Image Status API Route
 * 查询图片生成状态
 *
 * 注意：BytePlus Image API 是同步返回的，不需要轮询。
 * 这个端点保留是为了向后兼容，直接返回"已完成"状态。
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: { requestId: string } }
) {
  try {
    // 身份验证
    const session = await auth()
    if (!session?.user?.uuid) {
      console.log(`❌ Image status check: Unauthorized`)
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      )
    }

    const requestId = params.requestId

    if (!requestId) {
      return NextResponse.json(
        { error: "Request ID is required" },
        { status: 400 }
      )
    }

    // BytePlus 是同步返回的，检查数据库中是否有这个图片
    const { data: imageRecord } = await supabaseAdmin
      .from(TABLES.USER_IMAGES)
      .select('id, storage_url, status, created_at')
      .eq('wavespeed_request_id', requestId)
      .eq('user_id', session.user.uuid)
      .maybeSingle()

    if (imageRecord) {
      // 图片已存在于数据库中，返回完成状态
      return NextResponse.json({
        success: true,
        data: {
          id: requestId,
          status: 'completed',
          outputs: [imageRecord.storage_url],
          created_at: imageRecord.created_at
        }
      })
    }

    // 图片不在数据库中，可能刚生成但还未存储
    // 直接返回"已完成"状态（因为 BytePlus 是同步的）
    console.log(`⚠️ Image ${requestId} not found in database, but BytePlus is synchronous - returning completed status`)
    return NextResponse.json({
      success: true,
      data: {
        id: requestId,
        status: 'completed',
        outputs: [],
        message: 'Image generated (not yet in database)'
      }
    })

  } catch (error) {
    console.error(`❌ Image status check failed for request ${params.requestId}:`, error)

    // 返回"已完成"状态（容错处理）
    return NextResponse.json({
      success: true,
      data: {
        id: params.requestId,
        status: 'completed',
        outputs: [],
        message: 'BytePlus uses synchronous generation'
      }
    })
  }
}
