/**
 * Video Effects API Route
 * Handle video effects generation requests, call Wavespeed Video Effects API
 */

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

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

    // Call Wavespeed Video Effects API
    const wavespeedResponse = await submitVideoEffectsGeneration({
      image: body.image,
      effectId: body.effectId
    })

    // Check if we got a valid request ID
    if (!wavespeedResponse.data?.id) {
      throw new Error("Video effects generation failed - no request ID received")
    }


    return NextResponse.json({
      success: true,
      data: {
        requestId: wavespeedResponse.data.id,
        estimatedTime: 120 // Default 2 minutes for video effects
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

/**
 * Call Wavespeed Video Effects API
 */
async function submitVideoEffectsGeneration({
  image,
  effectId
}: {
  image: string
  effectId: string
}): Promise<WavespeedVideoEffectsResponse> {
  // Use the same API key as image-to-video
  const WAVESPEED_API_KEY = "a329907377c20848f126692adb8cd0594e1a1ebef19140b7369b79a69c800929"

  const url = `https://api.wavespeed.ai/api/v3/video-effects/${effectId}`


  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${WAVESPEED_API_KEY}`
      },
      body: JSON.stringify({
        image,
        // blueprint-supreme特效需要bgm参数（布尔值）
        ...(effectId === 'blueprint-supreme' && { bgm: true })
      })
    })

    const data = await response.json()


    if (!response.ok) {
      // Handle specific API errors
      if (response.status === 400) {
        if (data.error?.includes('image')) {
          throw new Error('invalid image')
        }
        if (data.error?.includes('effect')) {
          throw new Error('effect not found')
        }
        if (data.message?.includes('bgm')) {
          console.error(`❌ BGM parameter issue for effect ${effectId}:`, data.message)
          throw new Error('special effect configuration error')
        }
      }

      if (response.status === 429) {
        throw new Error('rate limit exceeded')
      }

      throw new Error(data.error || `Wavespeed API error: ${response.status}`)
    }

    return data

  } catch (error) {
    console.error('🌊 Wavespeed Video Effects API error:', error)

    if (error instanceof Error) {
      throw error
    }

    throw new Error('Failed to call Wavespeed Video Effects API')
  }
}