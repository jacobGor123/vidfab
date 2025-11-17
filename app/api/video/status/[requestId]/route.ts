/**
 * Video Status Check API Route
 * 轮询视频生成状态，查询Wavespeed API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  checkVideoStatus,
  WavespeedAPIError
} from "@/lib/services/wavespeed-api"

interface RouteParams {
  params: {
    requestId: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { requestId } = await params

    // 🔥 暂时移除认证检查，允许内部轮询调用
    // const session = await auth(request)
    // if (!session?.user) {
    //   return NextResponse.json(
    //     { error: "Authentication required", code: "AUTH_REQUIRED" },
    //     { status: 401 }
    //   )
    // }

    // 验证 requestId 参数
    if (!requestId || typeof requestId !== 'string') {
      return NextResponse.json(
        { error: "Invalid request ID" },
        { status: 400 }
      )
    }


    // 查询 Wavespeed API 状态
    const statusResult = await checkVideoStatus(requestId)

    // 构建响应数据
    const responseData = {
      requestId,
      status: statusResult.data.status,
      progress: statusResult.data.progress || 0,
      error: statusResult.data.error,
      createdAt: statusResult.data.created_at,
      updatedAt: statusResult.data.updated_at,
      resultUrl: undefined as string | undefined
    }

    // 如果任务完成，添加结果URL
    if (statusResult.data.status === "completed" && statusResult.data.outputs?.length) {
      responseData.resultUrl = statusResult.data.outputs[0]
    }

    return NextResponse.json({
      success: true,
      data: responseData
    })

  } catch (error) {
    const { requestId: errorRequestId } = await params
    console.error(`❌ Status check failed for request ${errorRequestId}:`, error)

    // 处理 Wavespeed API 错误
    if (error instanceof WavespeedAPIError) {
      // 404 通常表示 request ID 不存在或已过期
      if (error.status === 404) {
        return NextResponse.json(
          {
            error: "Video generation request not found or expired",
            code: "REQUEST_NOT_FOUND"
          },
          { status: 404 }
        )
      }

      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          status: error.status
        },
        { status: error.status >= 500 ? 500 : 400 }
      )
    }

    // 处理其他错误
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

// 处理不支持的HTTP方法
export async function POST() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function PUT() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}

export async function DELETE() {
  return NextResponse.json(
    { error: "Method not allowed" },
    { status: 405 }
  )
}