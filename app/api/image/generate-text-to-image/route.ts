/**
 * Text-to-Image Generation API Route
 * 处理文生图请求，验证用户登录状态，调用 BytePlus Seedream API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { submitImageGeneration } from "@/lib/services/byteplus/image/seedream-api"
import { BytePlusAPIError } from "@/lib/services/byteplus/core/errors"
import { ImageGenerationRequest, getImageGenerationType } from "@/lib/types/image"
import { checkImageGenerationCredits, deductUserCredits, IMAGE_GENERATION_CREDITS } from "@/lib/simple-credits-check"
import { supabaseAdmin, TABLES } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    // 认证检查
    const session = await auth()

    if (!session?.user) {
      console.error('❌ Text-to-image generate: Authentication failed')
      return NextResponse.json(
        { error: "Authentication required", code: "AUTH_REQUIRED" },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.error('❌ Text-to-image generate: User UUID missing')
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

    // 确保这是文生图请求
    const generationType = getImageGenerationType(body)
    if (generationType !== "text-to-image") {
      return NextResponse.json(
        {
          error: "This endpoint is for text-to-image generation only",
          code: "INVALID_GENERATION_TYPE"
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

    if (!body.aspectRatio) {
      return NextResponse.json(
        { error: "Aspect ratio is required", code: "MISSING_ASPECT_RATIO" },
        { status: 400 }
      )
    }

    // 检查用户积分
    const creditsCheck = await checkImageGenerationCredits(session.user.uuid)

    if (!creditsCheck.success) {
      console.error('❌ Text-to-image 积分检查失败:', creditsCheck.error)
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
      console.log(`❌ Text-to-image 积分不足: 需要 ${IMAGE_GENERATION_CREDITS}, 用户有 ${creditsCheck.userCredits}`)
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
      console.error('❌ Text-to-image 积分扣除失败:', deductResult.error)
      return NextResponse.json(
        {
          error: "Credits deduction failed",
          code: "CREDITS_ERROR",
          message: "Failed to deduct credits. Please try again later."
        },
        { status: 500 }
      )
    }

    console.log(`✅ Text-to-image 积分扣除成功: ${IMAGE_GENERATION_CREDITS} 积分，剩余: ${deductResult.newBalance}`)

    // 🔥 根据用户订阅状态设置水印（付费用户关闭，免费用户开启）
    const { data: userData } = await supabaseAdmin
      .from(TABLES.USERS)
      .select('subscription_plan')
      .eq('uuid', session.user.uuid)
      .single()

    const isFreeUser = !userData || userData.subscription_plan === 'free'
    body.watermark = isFreeUser  // 免费用户开启水印，付费用户关闭

    console.log(`🎨 水印设置: ${isFreeUser ? '开启' : '关闭'} (用户套餐: ${userData?.subscription_plan || 'free'})`)

    // 调用 BytePlus Seedream API（同步返回）
    let result
    try {
      result = await submitImageGeneration(body)
    } catch (imageError) {
      // 生成失败时恢复积分
      console.log('❌ Text-to-image API 调用失败，恢复积分...')
      const restoreResult = await deductUserCredits(session.user.uuid, -IMAGE_GENERATION_CREDITS)
      if (restoreResult.success) {
        console.log(`✅ 积分已恢复: +${IMAGE_GENERATION_CREDITS}, 新余额: ${restoreResult.newBalance}`)
      } else {
        console.error('❌ 积分恢复失败:', restoreResult.error)
      }

      throw imageError
    }

    const localId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    // BytePlus 同步返回图片 URL，立即存储到数据库
    console.log('💾 Storing image to database...')
    try {
      const storeResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/image/store`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.uuid,
          userEmail: session.user.email || 'unknown@vidfab.ai',
          wavespeedRequestId: result.data.id,
          originalUrl: result.imageUrl,
          settings: {
            prompt: body.prompt,
            model: body.model,
            aspectRatio: body.aspectRatio,
            generationType: 'text-to-image'
          }
        })
      })

      if (storeResponse.ok) {
        const storeData = await storeResponse.json()
        console.log(`✅ Image stored successfully: ${storeData.data?.imageId}`)
      } else {
        console.error('⚠️ Image storage failed, but continuing (image URL still available)')
      }
    } catch (storeError) {
      console.error('⚠️ Image storage error:', storeError)
      // 不抛出错误，因为图片已生成成功
    }

    // BytePlus 同步返回图片 URL，直接返回
    return NextResponse.json({
      success: true,
      data: {
        requestId: result.data.id,
        localId: localId,
        userId: session.user.uuid,
        imageUrl: result.imageUrl,  // 直接包含图片 URL
        generationType: "text-to-image",
        creditsDeducted: IMAGE_GENERATION_CREDITS
      }
    })

  } catch (error) {
    console.error("❌ Text-to-image generation request failed:", error)

    // 处理 BytePlus API 错误
    if (error instanceof BytePlusAPIError) {
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
