/**
 * API Route: 获取脚本创建配额状态
 * GET /api/video-agent/quota-status
 *
 * 功能：
 * - 获取用户当月脚本创建配额使用情况
 * - 不扣除积分，仅查询状态
 * - 用于前端显示 "剩余 X/Y 次免费脚本"
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/middleware/auth'
import { getScriptCreationQuotaStatus } from '@/lib/video-agent/script-creation-quota'

/**
 * GET /api/video-agent/quota-status
 *
 * Response:
 * {
 *   "success": true,
 *   "data": {
 *     "planId": "free",
 *     "monthlyQuota": 5,
 *     "currentUsage": 2,
 *     "remainingFree": 3,
 *     "month": "2026-02"
 *   }
 * }
 */
export const GET = withAuth(async (req, { params, userId }) => {
  try {
    const quotaStatus = await getScriptCreationQuotaStatus(userId)

    return NextResponse.json({
      success: true,
      data: quotaStatus
    })

  } catch (error: any) {
    console.error('[API /quota-status] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch quota status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
})
