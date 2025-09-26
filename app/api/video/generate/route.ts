/**
 * Video Generation API Route
 * 处理视频生成请求，验证用户登录状态，调用Wavespeed API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  submitVideoGeneration,
  validateVideoRequest,
  WavespeedAPIError
} from "@/lib/services/wavespeed-api"
import { VideoGenerationRequest, getGenerationType } from "@/lib/types/video"

export async function POST(request: NextRequest) {
  try {
    // NextAuth 4.x 认证方式
    const session = await auth()

    if (!session?.user) {
      console.error('❌ Video generate: Authentication failed')
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.error('❌ Video generate: User UUID missing')
      return NextResponse.json(
        { error: "User UUID required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    // 解析请求体
    let body: VideoGenerationRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }


    // 验证请求参数
    const validationErrors = validateVideoRequest(body)
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:', validationErrors)
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // 确定生成类型
    const generationType = getGenerationType(body)


    // 调用统一的视频生成API（自动处理text-to-video和image-to-video）
    const result = await submitVideoGeneration(body)

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        requestId: result.data.id,
        localId: `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: session.user.uuid,
        estimatedTime: "2-5 minutes" // 可以根据参数动态计算
      }
    })

  } catch (error) {
    console.error("❌ Video generation request failed:", error)

    // 处理 Wavespeed API 错误
    if (error instanceof WavespeedAPIError) {
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
export async function GET() {
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