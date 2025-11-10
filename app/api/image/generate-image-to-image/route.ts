/**
 * Image-to-Image Generation API Route
 * 处理图生图请求，验证用户登录状态，调用 Wavespeed API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  submitImageGeneration,
  WavespeedImageAPIError
} from "@/lib/services/wavespeed-image-api"
import { ImageGenerationRequest, getImageGenerationType } from "@/lib/types/image"
import { checkImageGenerationCredits, deductUserCredits, IMAGE_GENERATION_CREDITS } from "@/lib/simple-credits-check"

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const session = await auth()

    if (!session?.user) {
      console.error('❌ Image-to-image generate: Authentication failed')
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.error('❌ Image-to-image generate: User UUID missing')
      return NextResponse.json(
        { error: "User UUID required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    // 解析请求体
    let body: ImageGenerationRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }

    // 确保这是图生图请求
    if (!body.images || body.images.length === 0) {
      return NextResponse.json(
        {
          error: "At least one image is required for image-to-image generation",
          code: "IMAGE_REQUIRED"
        },
        { status: 400 }
      )
    }

    const generationType = getImageGenerationType(body)
    if (generationType !== "image-to-image") {
      return NextResponse.json(
        {
          error: "This endpoint is for image-to-image generation only",
          code: "INVALID_GENERATION_TYPE"
        },
        { status: 400 }
      )
    }

    // 验证图片数量限制
    if (body.images.length > 3) {
      return NextResponse.json(
        {
          error: "Maximum 3 images allowed",
          code: "TOO_MANY_IMAGES"
        },
        { status: 400 }
      )
    }

    // 验证必需参数
    if (!body.prompt?.trim()) {
      return NextResponse.json(
        { error: "Prompt is required", code: "MISSING_PROMPT" },
        { status: 400 }
      )
    }

    if (!body.model) {
      return NextResponse.json(
        { error: "Model is required", code: "MISSING_MODEL" },
        { status: 400 }
      )
    }

    // 检查用户积分
    const creditsCheck = await checkImageGenerationCredits(session.user.uuid)

    if (!creditsCheck.success) {
      console.error('❌ Image-to-image 积分检查失败:', creditsCheck.error)
      return NextResponse.json(
        {
          error: "Credits verification failed",
          code: "CREDITS_ERROR",
          message: "Unable to verify credits. Please try again later."
        },
        { status: 500 }
      )
    }

    if (!creditsCheck.canAfford) {
      console.log(`❌ Image-to-image 积分不足: 需要 ${IMAGE_GENERATION_CREDITS}, 用户有 ${creditsCheck.userCredits}`)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS",
          message: `You need ${IMAGE_GENERATION_CREDITS} credits but only have ${creditsCheck.userCredits}. Please upgrade your plan.`,
          requiredCredits: IMAGE_GENERATION_CREDITS,
          userCredits: creditsCheck.userCredits
        },
        { status: 402 }
      )
    }

    // 立即扣除积分
    const deductResult = await deductUserCredits(session.user.uuid, IMAGE_GENERATION_CREDITS)
    if (!deductResult.success) {
      console.error('❌ Image-to-image 积分扣除失败:', deductResult.error)
      return NextResponse.json(
        {
          error: "Credits deduction failed",
          code: "CREDITS_ERROR",
          message: "Failed to deduct credits. Please try again later."
        },
        { status: 500 }
      )
    }

    console.log(`✅ Image-to-image 积分扣除成功: ${IMAGE_GENERATION_CREDITS} 积分，剩余: ${deductResult.newBalance}`)

    // 调用 Wavespeed API
    let result
    try {
      result = await submitImageGeneration(body)
    } catch (imageError) {
      // 生成失败时恢复积分
      console.log('❌ Image-to-image API 调用失败，恢复积分...')
      const restoreResult = await deductUserCredits(session.user.uuid, -IMAGE_GENERATION_CREDITS)
      if (restoreResult.success) {
        console.log(`✅ 积分已恢复: +${IMAGE_GENERATION_CREDITS}, 新余额: ${restoreResult.newBalance}`)
      } else {
        console.error('❌ 积分恢复失败:', restoreResult.error)
      }

      throw imageError
    }

    // 返回成功响应
    return NextResponse.json({
      success: true,
      data: {
        requestId: result.data.id,
        localId: `img_i2i_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: session.user.uuid,
        estimatedTime: "30-60 seconds",
        generationType: "image-to-image",
        creditsDeducted: IMAGE_GENERATION_CREDITS
      }
    })

  } catch (error) {
    console.error("❌ Image-to-image generation request failed:", error)

    // 处理 Wavespeed API 错误
    if (error instanceof WavespeedImageAPIError) {
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
        message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
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
