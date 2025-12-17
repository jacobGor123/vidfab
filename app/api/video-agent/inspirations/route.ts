/**
 * Video Agent - AI 灵感生成 API
 * GET /api/video-agent/inspirations
 *
 * 使用 Brave Search + Gemini 3 Pro 生成 5 个热门短视频脚本创意
 */

import { NextResponse } from 'next/server'
import { generateInspirations } from '@/lib/services/video-agent/inspiration-generator'

export const runtime = 'nodejs'
export const maxDuration = 60  // 允许 60 秒超时（Gemini 生成可能需要时间）

/**
 * GET /api/video-agent/inspirations
 * 生成 AI 灵感脚本
 */
export async function GET() {
  try {
    console.log('[API] Generating AI inspirations...')

    const inspirations = await generateInspirations()

    return NextResponse.json({
      success: true,
      data: inspirations
    })

  } catch (error: any) {
    console.error('[API] Inspiration generation failed:', error)

    return NextResponse.json(
      {
        error: 'Failed to generate inspirations',
        details: error.message
      },
      { status: 500 }
    )
  }
}
