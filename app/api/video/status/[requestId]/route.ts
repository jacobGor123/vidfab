/**
 * Video Status Check API Route
 * 轮询视频生成状态，支持 BytePlus/Wavespeed 灰度切换
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  checkVideoStatus as checkWavespeedStatus,
  WavespeedAPIError
} from "@/lib/services/wavespeed-api"
import { checkVideoStatus as checkBytePlusStatus } from "@/lib/services/byteplus/video/seedance-api"

const USE_BYTEPLUS = process.env.USE_BYTEPLUS
  ? process.env.USE_BYTEPLUS !== 'false'
  : true // 默认启用 BytePlus，除非明确设置为 'false'

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

    // 🔥 检查 requestId 前缀，判断使用哪个 API
    let actualRequestId = requestId
    let useWavespeed = false

    if (requestId.startsWith('wavespeed:')) {
      useWavespeed = true
      actualRequestId = requestId.substring('wavespeed:'.length)
      console.log(`🔍 检测到 Wavespeed 前缀，使用 Wavespeed API 查询状态`)
    } else if (requestId.startsWith('byteplus:')) {
      useWavespeed = false
      actualRequestId = requestId.substring('byteplus:'.length)
      console.log(`🔍 检测到 BytePlus 前缀，使用 BytePlus API 查询状态`)
    } else {
      // 没有前缀（兼容旧数据），使用默认逻辑
      console.warn(`⚠️ requestId 没有前缀: ${requestId}，使用默认 API 逻辑`)
      const useBytePlus = USE_BYTEPLUS || process.env.NODE_ENV === 'development'
      useWavespeed = !useBytePlus
      console.log(`🔍 默认使用 ${useWavespeed ? 'Wavespeed' : 'BytePlus'} API 查询状态`)
    }

    // 查询状态
    const statusResult = useWavespeed
      ? await checkWavespeedStatus(actualRequestId)
      : await checkBytePlusStatus(actualRequestId)

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
    if (statusResult.data.status === "completed") {
      if (statusResult.data.outputs?.length) {
        responseData.resultUrl = statusResult.data.outputs[0]
      } else {
        // Task completed but no output - mark as failed
        responseData.status = 'failed'
        responseData.error = statusResult.data.error || 'Video generation completed but no output was produced. Please retry.'
      }
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

    // 处理 BytePlus API 错误
    if ((error as any)?.name === 'BytePlusAPIError') {
      const status = (error as any).status || 500
      // 404 时同样返回 not found
      if (status === 404) {
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
          error: (error as any).message,
          code: (error as any).code,
          status
        },
        { status: status >= 500 ? 500 : 400 }
      )
    }

    // 处理其他错误
    return NextResponse.json(
      {
        error: "Internal server error",
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
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
