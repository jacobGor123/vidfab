/**
 * Session 调试 API - 检查后端是否能正确解析 session
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { getServerSession } from "next-auth"
import { authConfig } from "@/auth/config"

export async function GET(request: NextRequest) {
  try {
    // 1. 检查 Cookie 是否存在
    const cookies = request.cookies
    const sessionToken = cookies.get('next-auth.session-token')
    const sessionTokenValue = sessionToken?.value

    console.log('🔍 Session Debug:')
    console.log('  Cookie exists:', !!sessionTokenValue)
    if (sessionTokenValue) {
      console.log('  Cookie value (first 50 chars):', sessionTokenValue.substring(0, 50))
    }

    // 2. 尝试获取 session
    const session = await auth()

    console.log('  Session parsed:', !!session)
    if (session?.user) {
      console.log('  User email:', session.user.email)
      console.log('  User uuid:', session.user.uuid)
    }

    // 3. 检查环境变量
    const hasSecret = !!process.env.NEXTAUTH_SECRET
    const hasUrl = !!process.env.NEXTAUTH_URL
    const nodeEnv = process.env.NODE_ENV
    const cookieSecure = process.env.NEXTAUTH_COOKIE_SECURE

    console.log('  NEXTAUTH_SECRET exists:', hasSecret)
    console.log('  NEXTAUTH_URL:', process.env.NEXTAUTH_URL)
    console.log('  NODE_ENV:', nodeEnv)
    console.log('  NEXTAUTH_COOKIE_SECURE:', cookieSecure)

    // 4. 返回诊断结果
    return NextResponse.json({
      cookie: {
        exists: !!sessionTokenValue,
        name: sessionToken?.name,
        valuePreview: sessionTokenValue ? sessionTokenValue.substring(0, 50) + '...' : null
      },
      session: {
        parsed: !!session,
        hasUser: !!session?.user,
        user: session?.user ? {
          email: session.user.email,
          uuid: session.user.uuid,
          nickname: session.user.nickname
        } : null
      },
      environment: {
        hasNextAuthSecret: hasSecret,
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nodeEnv,
        cookieSecure,
        dockerEnv: !!process.env.DOCKER_ENVIRONMENT
      },
      diagnosis: {
        cookieSent: !!sessionTokenValue,
        sessionParsed: !!session,
        problem: !sessionTokenValue
          ? "Cookie 未发送到服务器"
          : !session
            ? "Cookie 存在但无法解析 - 可能是 NEXTAUTH_SECRET 不匹配或 token 已过期"
            : "一切正常"
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('❌ Session debug error:', error)
    return NextResponse.json(
      {
        error: "Failed to debug session",
        message: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    )
  }
}
