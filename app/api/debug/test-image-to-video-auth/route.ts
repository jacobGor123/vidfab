/**
 * 测试 Image-to-Video API 的认证问题
 * 完全模拟 generate-image-to-video 的认证流程
 */
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"

export async function POST(request: NextRequest) {
  console.log('\n\n🔍 ==========================================')
  console.log('🔍 [TEST] Image-to-Video Auth Test Starting')
  console.log('🔍 ==========================================\n')

  try {
    // 1. 检查 Cookie
    console.log('📋 Step 1: Checking cookies...')
    const cookies = request.cookies
    const sessionToken = cookies.get('next-auth.session-token')
    console.log('  Cookie exists:', !!sessionToken)
    if (sessionToken) {
      console.log('  Cookie value (first 50):', sessionToken.value.substring(0, 50))
    } else {
      console.log('  ❌ NO COOKIE FOUND!')
    }

    // 2. 尝试获取 session (完全模拟 generate-image-to-video 的代码)
    console.log('\n📋 Step 2: Calling auth()...')
    const session = await auth()

    console.log('  Session result:', session ? '✅ Found' : '❌ Not found')

    if (session?.user) {
      console.log('  ✅ Session user exists')
      console.log('    Email:', session.user.email)
      console.log('    UUID:', session.user.uuid)
    } else {
      console.log('  ❌ Session user does not exist')
    }

    // 3. 模拟 API 的认证检查逻辑
    console.log('\n📋 Step 3: Simulating API auth check...')

    if (!session?.user) {
      console.log('  ❌ Would return 401: Authentication failed')
      return NextResponse.json(
        {
          error: "Authentication required",
          code: "AUTH_REQUIRED",
          debug: {
            hadCookie: !!sessionToken,
            hadSession: !!session,
            hadUser: !!session?.user
          }
        },
        { status: 401 }
      )
    }

    if (!session.user.uuid) {
      console.log('  ❌ Would return 401: User UUID missing')
      return NextResponse.json(
        {
          error: "User UUID required",
          code: "AUTH_REQUIRED",
          debug: {
            hadCookie: !!sessionToken,
            hadSession: !!session,
            hadUser: !!session?.user,
            hadUUID: false
          }
        },
        { status: 401 }
      )
    }

    console.log('  ✅ Auth check passed!')
    console.log('\n🔍 ==========================================')
    console.log('🔍 [TEST] Image-to-Video Auth Test PASSED')
    console.log('🔍 ==========================================\n')

    return NextResponse.json({
      success: true,
      message: "Authentication would succeed",
      debug: {
        hadCookie: !!sessionToken,
        hadSession: !!session,
        hadUser: !!session?.user,
        hadUUID: !!session.user.uuid,
        userEmail: session.user.email,
        userUUID: session.user.uuid
      }
    })

  } catch (error) {
    console.error('\n❌ [TEST] Error during test:', error)
    console.log('🔍 ==========================================\n')

    return NextResponse.json(
      {
        error: "Test failed",
        message: error instanceof Error ? error.message : "Unknown error",
        debug: {
          errorType: error instanceof Error ? error.constructor.name : typeof error
        }
      },
      { status: 500 }
    )
  }
}
