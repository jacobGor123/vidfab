/**
 * Revalidate API
 * 手动清除 Next.js ISR 缓存
 *
 * 使用方法:
 * curl "https://vidfab.ai/api/revalidate?secret=YOUR_SECRET&path=/blog"
 * curl "https://vidfab.ai/api/revalidate?secret=YOUR_SECRET&path=/blog/article-slug"
 */

import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

export const runtime = 'nodejs'

/**
 * GET /api/revalidate?secret=xxx&path=/blog
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const secret = searchParams.get('secret')
  const path = searchParams.get('path')

  // 验证 secret（使用 CRON_SECRET）
  if (secret !== process.env.CRON_SECRET) {
    console.error('❌ Unauthorized revalidate request')
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid secret',
      },
      { status: 401 }
    )
  }

  // 检查 path 参数
  if (!path) {
    return NextResponse.json(
      {
        success: false,
        message: 'Missing path parameter',
        usage: '/api/revalidate?secret=xxx&path=/blog',
      },
      { status: 400 }
    )
  }

  try {
    // 清除指定路径的缓存
    revalidatePath(path)

    console.log(`✅ Cache revalidated for path: ${path}`)

    return NextResponse.json({
      success: true,
      message: `Cache cleared for path: ${path}`,
      revalidated: true,
      path,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error(`❌ Failed to revalidate path: ${path}`, error)

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to revalidate',
        path,
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/revalidate
 * 批量清除多个路径的缓存
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`

  if (authHeader !== expectedAuth) {
    return NextResponse.json(
      {
        success: false,
        message: 'Invalid secret',
      },
      { status: 401 }
    )
  }

  try {
    const body = await request.json()
    const paths = body.paths as string[]

    if (!Array.isArray(paths) || paths.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Missing or invalid paths array',
          usage: '{ "paths": ["/blog", "/blog/article-slug"] }',
        },
        { status: 400 }
      )
    }

    // 批量清除缓存
    const results = []
    for (const path of paths) {
      try {
        revalidatePath(path)
        results.push({ path, success: true })
        console.log(`✅ Cache revalidated: ${path}`)
      } catch (error: any) {
        results.push({ path, success: false, error: error.message })
        console.error(`❌ Failed to revalidate: ${path}`, error)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.length - successCount

    return NextResponse.json({
      success: failureCount === 0,
      message: `Revalidated ${successCount}/${results.length} paths`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failure: failureCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('❌ Batch revalidation failed:', error)

    return NextResponse.json(
      {
        success: false,
        message: error.message || 'Failed to revalidate',
      },
      { status: 500 }
    )
  }
}
