/**
 * KIE API - Music Generation Webhook
 * 接收 KIE API 音乐生成完成的回调通知
 */

import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/webhooks/kie/music
 *
 * KIE API 会在音乐生成完成时调用此端点
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    console.log('[KIE Webhook] Music generation callback received:', {
      taskId: body.taskId,
      status: body.status,
      timestamp: new Date().toISOString()
    })

    // 记录完整的回调数据（用于调试）
    console.log('[KIE Webhook] Full callback data:', JSON.stringify(body, null, 2))

    // 返回成功响应
    return NextResponse.json({
      success: true,
      message: 'Webhook received'
    })

  } catch (error) {
    console.error('[KIE Webhook] Error processing webhook:', error)

    // 即使出错也返回 200，避免 KIE 重试
    return NextResponse.json({
      success: false,
      error: 'Internal error'
    }, { status: 200 })
  }
}

/**
 * GET /api/webhooks/kie/music
 *
 * 健康检查端点
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: 'KIE Music Generation Webhook',
    timestamp: new Date().toISOString()
  })
}
