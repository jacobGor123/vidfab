/**
 * Video Effects API Route
 * Handle video effects generation requests, call Wavespeed Video Effects API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { checkUserCredits, deductUserCredits } from "@/lib/simple-credits-check"
import { submitVideoEffectsGeneration } from "@/lib/services/wavespeed-api"

interface VideoEffectsRequest {
  image: string
  effectId: string
  effectName?: string
}

interface WavespeedVideoEffectsResponse {
  success: boolean
  data?: {
    requestId: string
    estimatedTime?: number
  }
  error?: string
  message?: string
}

export async function POST(request: NextRequest) {
  try {
    // NextAuth 4.x 认证方式
    const session = await auth()


    if (!session?.user) {
      console.error('❌ No session or user found for video effects request')
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.error('❌ User session exists but missing UUID:', session.user)
      return NextResponse.json(
        { error: "User UUID required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    // Parse request body
    let body: VideoEffectsRequest
    try {
      body = await request.json()
    } catch (error) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 }
      )
    }


    // Validate request parameters
    if (!body.image) {
      return NextResponse.json(
        { error: "Image is required for video effects generation" },
        { status: 400 }
      )
    }

    if (!body.effectId) {
      return NextResponse.json(
        { error: "Effect ID is required" },
        { status: 400 }
      )
    }

    // 🔥 简化积分检查 - 检查用户积分是否足够
    // 检查用户积分（视频特效固定消耗积分，时长5s）
    const creditsCheck = await checkUserCredits(
      session.user.uuid,
      'video-effects' as any,
      'standard', // 视频特效没有分辨率概念，使用标准值
      '5'
    )

    if (!creditsCheck.success) {
      console.error('❌ Video Effects 积分检查失败:', creditsCheck.error)
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
      console.log(`❌ Video Effects 积分不足: 需要 ${creditsCheck.requiredCredits}, 用户有 ${creditsCheck.userCredits}`)
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
      console.error('❌ Video Effects 积分扣除失败:', deductResult.error)
      return NextResponse.json(
        {
          error: "Credits deduction failed",
          code: "CREDITS_ERROR",
          message: "Failed to deduct credits. Please try again later."
        },
        { status: 500 }
      )
    }

    console.log(`✅ Video Effects 积分扣除成功: ${creditsCheck.requiredCredits} 积分，剩余: ${deductResult.newBalance}`)

    // Call Wavespeed Video Effects API
    let wavespeedResponse
    try {
      wavespeedResponse = await submitVideoEffectsGeneration({
        image: body.image,
        effectId: body.effectId,
        effectName: body.effectName // 🔥 传递特效名称用于显示
      })
    } catch (videoError) {
      // 🔥 视频生成失败时恢复积分
      console.log('❌ Video Effects API 调用失败，恢复积分...')
      const restoreResult = await deductUserCredits(session.user.uuid, -creditsCheck.requiredCredits)
      if (restoreResult.success) {
        console.log(`✅ 积分已恢复: +${creditsCheck.requiredCredits}, 新余额: ${restoreResult.newBalance}`)
      } else {
        console.error('❌ 积分恢复失败:', restoreResult.error)
      }

      // 重新抛出视频生成错误
      throw videoError
    }

    // Check if we got a valid request ID
    if (!wavespeedResponse.data?.id) {
      throw new Error("Video effects generation failed - no request ID received")
    }


    return NextResponse.json({
      success: true,
      data: {
        requestId: `wavespeed:${wavespeedResponse.data.id}`, // 🔥 添加提供商前缀
        estimatedTime: 120, // Default 2 minutes for video effects
        creditsDeducted: creditsCheck.requiredCredits // 🔥 记录已扣除的积分数量
      }
    })

  } catch (error) {
    console.error('❌ Video effects generation error:', error)

    // Handle different types of errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: "Request rate limit exceeded, please try again later" },
          { status: 429 }
        )
      }

      if (error.message.includes('invalid image')) {
        return NextResponse.json(
          { error: "Invalid image format, please upload a valid image file" },
          { status: 400 }
        )
      }

      if (error.message.includes('effect not found')) {
        return NextResponse.json(
          { error: "Selected effect does not exist, please choose again" },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: "Video effects generation failed, please try again" },
      { status: 500 }
    )
  }
}

