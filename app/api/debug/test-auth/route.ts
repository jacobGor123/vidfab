/**
 * 测试 API Route 中的认证
 * 验证 POST 请求是否能正确获取 session
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"

export async function POST(request: NextRequest) {
  console.log('\n🔍 [DEBUG] Testing POST API Route Auth...')
  console.log('[DEBUG] Request method:', request.method)
  console.log('[DEBUG] Request URL:', request.url)

  try {
    // 方法 1：使用我们封装的 auth() 函数
    console.log('[DEBUG] Method 1: Using auth() wrapper')
    const session1 = await auth()
    console.log('[DEBUG] auth() result:', session1 ? '✅ Session found' : '❌ No session')
    if (session1?.user) {
      console.log('[DEBUG] User email:', session1.user.email)
      console.log('[DEBUG] User UUID:', session1.user.uuid)
    }

    // 方法 2：直接使用 getServerSession
    console.log('[DEBUG] Method 2: Using getServerSession directly')
    const session2 = await getServerSession(authConfig)
    console.log('[DEBUG] getServerSession result:', session2 ? '✅ Session found' : '❌ No session')
    if (session2?.user) {
      console.log('[DEBUG] User email:', session2.user.email)
    }

    // 检查 request cookies
    console.log('[DEBUG] Checking request cookies...')
    const cookies = request.cookies
    const sessionToken = cookies.get('next-auth.session-token')
    console.log('[DEBUG] Session cookie exists:', !!sessionToken)
    if (sessionToken) {
      console.log('[DEBUG] Cookie value (first 50):', sessionToken.value.substring(0, 50))
    }

    // 检查 headers
    const cookieHeader = request.headers.get('cookie')
    console.log('[DEBUG] Cookie header exists:', !!cookieHeader)
    if (cookieHeader) {
      console.log('[DEBUG] Cookie header (first 100):', cookieHeader.substring(0, 100))
    }

    return NextResponse.json({
      test: 'API Route Auth Test',
      method1_auth: {
        hasSession: !!session1,
        hasUser: !!session1?.user,
        userEmail: session1?.user?.email
      },
      method2_getServerSession: {
        hasSession: !!session2,
        hasUser: !!session2?.user,
        userEmail: session2?.user?.email
      },
      requestCookies: {
        hasSessionToken: !!sessionToken,
        tokenPreview: sessionToken ? sessionToken.value.substring(0, 50) + '...' : null
      },
      requestHeaders: {
        hasCookieHeader: !!cookieHeader,
        cookieHeaderPreview: cookieHeader ? cookieHeader.substring(0, 100) + '...' : null
      },
      diagnosis: {
        problem: !sessionToken
          ? "Cookie 未发送到 API route"
          : (!session1 && !session2)
            ? "Cookie 存在但 getServerSession 无法解析"
            : "认证正常",
        recommendation: !sessionToken
          ? "检查前端是否添加了 credentials: 'include'"
          : (!session1 && !session2)
            ? "可能是 Next.js 14 App Router 的 getServerSession 配置问题"
            : "无问题"
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('[DEBUG] Error during auth test:', error)
    return NextResponse.json(
      {
        error: "Auth test failed",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
