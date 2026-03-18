/**
 * Image-to-Video Generation API Route
 * 处理image-to-video请求，支持 BytePlus/Wavespeed 灰度切换
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import {
  submitImageToVideoGeneration,
  validateVideoRequest,
  WavespeedAPIError
} from "@/lib/services/wavespeed-api"
import { submitVideoGeneration as submitBytePlusVideoGeneration } from "@/lib/services/byteplus/video/seedance-api"
import { VideoGenerationRequest, getGenerationType } from "@/lib/types/video"
import { checkUserCredits, deductUserCredits } from "@/lib/simple-credits-check"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

const USE_BYTEPLUS = process.env.USE_BYTEPLUS
  ? process.env.USE_BYTEPLUS !== 'false'
  : true // 默认启用 BytePlus，除非明确设置为 'false'

export async function POST(request: NextRequest) {
  try {
    // NextAuth 4.x 认证方式 - 与text-to-video保持一致
    const session = await auth()

    if (!session?.user) {
      console.error('❌ Image-to-video generate: Authentication failed')
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.error('❌ Image-to-video generate: User UUID missing')
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
      console.error('❌ Validation failed:', validationErrors)
      return NextResponse.json(
        {
          error: "Validation failed",
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // 🔥 简化积分检查 - 检查用户积分是否足够
    const originalModel = body.model || 'default'
    const resolution = body.resolution || '720p'
    const duration = body.duration ? (typeof body.duration === 'number' ? `${body.duration}s` : body.duration) : '5s'

    // 映射前端模型名称到积分计算名称
    const modelForCredits = originalModel === 'vidfab-q1' ? 'vidfab-q1' :
                           originalModel === 'vidfab-pro' ? 'vidfab-pro' :
                           originalModel === 'video-effects' ? 'video-effects' :
                           'vidfab-q1'

    // 检查用户积分（seedance 1.5 Pro 需区分 audio）
    const generateAudio = body.generateAudio === true
    const creditsCheck = await checkUserCredits(
      session.user.uuid,
      modelForCredits as any,
      resolution,
      duration,
      generateAudio
    )

    if (!creditsCheck.success) {
      console.error('❌ Image-to-Video 积分检查失败:', creditsCheck.error)
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
      console.log(`❌ Image-to-Video 积分不足: 需要 ${creditsCheck.requiredCredits}, 用户有 ${creditsCheck.userCredits}`)
      return NextResponse.json(
        {
          error: "Insufficient credits",
          code: "INSUFFICIENT_CREDITS",
          message: `You need ${creditsCheck.requiredCredits} credits but only have ${creditsCheck.userCredits}. Please upgrade your plan.`,
          requiredCredits: creditsCheck.requiredCredits,
          userCredits: creditsCheck.userCredits
        },
        { status: 402 }
      )
    }

    // 立即扣除积分
    const deductResult = await deductUserCredits(session.user.uuid, creditsCheck.requiredCredits)
    if (!deductResult.success) {
      console.error('❌ Image-to-Video 积分扣除失败:', deductResult.error)
      return NextResponse.json(
        {
          error: "Credits deduction failed",
          code: "CREDITS_ERROR",
          message: "Failed to deduct credits. Please try again later."
        },
        { status: 500 }
      )
    }

    console.log(`✅ Image-to-Video 积分扣除成功: ${creditsCheck.requiredCredits} 积分，剩余: ${deductResult.newBalance}`)

    // 🔥 根据模型类型决定使用哪个 API 提供商
    // vidfab-pro (veo3) → 使用 Wavespeed
    // vidfab-q1 (seedance) → 使用 BytePlus
    const isVeo3Model = body.model === 'vidfab-pro'
    const useBytePlus = !isVeo3Model && (USE_BYTEPLUS || process.env.NODE_ENV === 'development')

    console.log(`🔧 API 提供商选择: ${isVeo3Model ? 'Wavespeed (veo3-fast)' : useBytePlus ? 'BytePlus (seedance)' : 'Wavespeed (seedance)'} (模型: ${body.model})`)

    // 🔥 根据用户订阅状态设置水印（付费用户关闭，免费用户开启）
    const { data: userData } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('subscription_plan')
      .eq('uuid', session.user.uuid)
      .single()

    const isFreeUser = !userData || userData.subscription_plan === 'free'
    body.watermark = isFreeUser  // 免费用户开启水印，付费用户关闭

    console.log(`🎨 水印设置: ${isFreeUser ? '开启' : '关闭'} (用户套餐: ${userData?.subscription_plan || 'free'})`)

    // 调用对应的 API
    let result
    try {
      if (useBytePlus) {
        result = await submitBytePlusVideoGeneration(body, { generateAudio })
      } else {
        // 🔥 vidfab-pro 或明确指定使用 Wavespeed
        result = await submitImageToVideoGeneration(body)
      }
    } catch (videoError) {
      // 🔥 视频生成失败时恢复积分
      console.log('❌ Image-to-Video API 调用失败，恢复积分...')
      const restoreResult = await deductUserCredits(session.user.uuid, -creditsCheck.requiredCredits)
      if (restoreResult.success) {
        console.log(`✅ 积分已恢复: +${creditsCheck.requiredCredits}, 新余额: ${restoreResult.newBalance}`)
      } else {
        console.error('❌ 积分恢复失败:', restoreResult.error)
      }

      // 重新抛出视频生成错误
      throw videoError
    }

    // 🔥 为 requestId 添加 API 提供商前缀，便于状态查询时识别
    const apiPrefix = useBytePlus ? 'byteplus:' : 'wavespeed:'
    const prefixedRequestId = `${apiPrefix}${result.data.id}`

    // 返回成功响应（与text-to-video完全一致的格式）
    return NextResponse.json({
      success: true,
      data: {
        requestId: prefixedRequestId,
        localId: `i2v_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: session.user.uuid,
        estimatedTime: "2-5 minutes", // 可以根据参数动态计算
        generationType: "image-to-video",
        creditsDeducted: creditsCheck.requiredCredits // 🔥 记录已扣除的积分数量
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

    // 处理 BytePlus API 错误
    if ((error as any)?.name === 'BytePlusAPIError') {
      const status = (error as any).status || 500
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
