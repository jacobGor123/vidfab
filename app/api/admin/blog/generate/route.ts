/**
 * Admin API - 手动触发 AI 文章生成
 * 仅供管理员手动测试使用
 *
 * POST /api/admin/blog/generate
 */

import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/admin/auth'
// 🔄 CLOUD NATIVE MIGRATION: 使用 Inngest 替代直接调用
// import { triggerManualGeneration } from '@/lib/blog/cron-service'
import { inngest } from '@/lib/inngest/client'

export const runtime = 'nodejs'
export const maxDuration = 300 // 5 分钟

/**
 * 手动触发 AI 文章生成
 * 需要管理员权限
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const user = await requireAdmin()

    console.log(`\n🔧 管理员手动触发文章生成: ${user.email}`)

    // 🔄 CLOUD NATIVE MIGRATION: 使用 Inngest 触发任务
    const result = await inngest.send({
      name: 'blog/generate.requested',
      data: {
        force: true, // 强制生成,即使已有今天的文章
        source: 'manual', // 🔒 明确标识：管理员手动触发
        triggeredBy: user.email,
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Article generation triggered successfully',
      triggeredBy: user.email,
      eventIds: result.ids,
      timestamp: new Date().toISOString(),
    })

  } catch (error: any) {
    console.error('❌ 手动触发失败:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to trigger generation',
      },
      { status: 500 }
    )
  }
}
