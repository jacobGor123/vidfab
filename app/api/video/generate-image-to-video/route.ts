/**
 * Image-to-Video Generation API Route
 * 处理image-to-video请求，完全复用text-to-video的架构模式
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  submitImageToVideoGeneration,
  validateVideoRequest,
  WavespeedAPIError
} from "@/lib/services/wavespeed-api"
import { VideoGenerationRequest, getGenerationType } from "@/lib/types/video"

export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
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

    // 确保这是image-to-video请求
    if (!body.image) {
      return NextResponse.json(
        {
          error: "Image is required for image-to-video generation",
          code: "IMAGE_REQUIRED"
        },
        { status: 400 }
      )
    }

    // 验证生成类型
    const generationType = getGenerationType(body)
    if (generationType !== "image-to-video") {
      return NextResponse.json(
        {
          error: "This endpoint is for image-to-video generation only",
          code: "INVALID_GENERATION_TYPE"
        },
        { status: 400 }
      )
    }

    // 验证请求参数
    const validationErrors = validateVideoRequest(body)
    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    console.log(`🎨 User ${session.user.email} requesting image-to-video generation:`, {
      prompt: body.prompt.substring(0, 50) + "...",
      model: body.model,
      resolution: body.resolution,
      duration: body.duration,
      hasImage: !!body.image,
      imageSize: body.image ? Math.round(body.image.length / 1024) + "KB" : undefined,
      cameraFixed: body.cameraFixed,
      seed: body.seed
    })

    // 调用Wavespeed Image-to-Video API
    const result = await submitImageToVideoGeneration(body)

    // 返回成功响应（与text-to-video完全一致的格式）
    return NextResponse.json({
      success: true,
      data: {
        requestId: result.data.id,
        localId: `i2v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: session.user.uuid,
        estimatedTime: "2-5 minutes", // 可以根据参数动态计算
        generationType: "image-to-video"
      }
    })

  } catch (error) {
    console.error("❌ Image-to-video generation request failed:", error)

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