/**
 * Image Status API Route
 * 查询图片生成状态
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkImageStatus, WavespeedImageAPIError } from "@/lib/services/wavespeed-image-api"

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

    // 查询图片生成状态
    const statusResult = await checkImageStatus(requestId)

    return NextResponse.json({
      success: true,
      data: statusResult.data
    })

  } catch (error) {
    console.error(`❌ Image status check failed for request ${params.requestId}:`, error)

    // 处理 Wavespeed API 错误
    if (error instanceof WavespeedImageAPIError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code
        },
        { status: error.status >= 500 ? 500 : 400 }
      )
    }

    // 处理其他错误
    return NextResponse.json(
      {
        error: "Failed to check image status",
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    )
  }
}
