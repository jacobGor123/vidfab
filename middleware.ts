/**
 * Middleware for VidFab AI Video Platform
 * Handles authentication - NextAuth 4.x compatible
 *
 * 逻辑说明：
 * - 默认所有页面都是公开的（营销页面、落地页等）
 * - 只有明确列在 protectedRoutes 中的页面需要登录
 * - 这样新增落地页时无需修改中间件配置
 */
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Auth routes that should redirect if already logged in
const authRoutes = ['/login', '/signup']

// Protected routes that require authentication (需要登录才能访问的页面)
const protectedRoutes = [
  '/profile',
  '/settings',
  '/video',
  '/subscription',
  // Note: /studio is NOT in this list - it's a public route accessible to all users
  // Note: /admin is NOT in this list - it's protected by admin layout's isCurrentUserAdmin() check
  // This ensures admin auth uses the same method as /debug-admin for consistency
]

function isAuthPath(pathname: string): boolean {
  return authRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )
}

function isProtectedPath(pathname: string): boolean {
  return protectedRoutes.some(route =>
    pathname.startsWith(route)
  )
}

function isStaticAsset(pathname: string): boolean {
  return (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/_vercel') ||
    pathname.includes('.') // files like favicon.ico, images, etc.
  )
}

export default withAuth(
  function middleware(req) {
    const { nextUrl } = req
    const isLoggedIn = !!req.nextauth?.token

    // 1. Skip middleware for API routes and static assets
    if (
      nextUrl.pathname.startsWith('/api/') ||
      isStaticAsset(nextUrl.pathname)
    ) {
      return NextResponse.next()
    }

    // 2. URL Rewrite: /studio/{tool} -> /create?tool={tool}
    // 保持浏览器 URL 为 /studio/{tool}，GA4 可以正确追踪路径
    if (nextUrl.pathname.startsWith('/studio/')) {
      // 工具名映射表：URL 路径 -> query 参数值
      const toolMap: Record<string, string> = {
        'discover': 'discover',
        'text-to-video': 'text-to-video',
        'image-to-video': 'image-to-video',
        'ai-video-effects': 'video-effects',
        'text-to-image': 'text-to-image',
        'image-to-image': 'image-to-image',
        'my-assets': 'my-assets',
        'plans': 'my-profile',
      }

      // 提取工具名: /studio/text-to-video -> text-to-video
      const pathParts = nextUrl.pathname.split('/').filter(Boolean)
      const toolPath = pathParts[1] // studio 后面的部分
      const tool = toolMap[toolPath] || 'discover'

      // 构建 rewrite URL: /create?tool={tool}
      const rewriteUrl = new URL('/create', nextUrl.origin)
      rewriteUrl.searchParams.set('tool', tool)

      // 保留原有的 query 参数（如 prompt, model 等）
      nextUrl.searchParams.forEach((value, key) => {
        rewriteUrl.searchParams.set(key, value)
      })

      // 使用 rewrite 而不是 redirect
      // rewrite: 浏览器 URL 保持 /studio/{tool}，但渲染 /create 的内容
      return NextResponse.rewrite(rewriteUrl)
    }

    // 3. Auth pages (login, signup) - redirect if already logged in
    if (isAuthPath(nextUrl.pathname)) {
      if (isLoggedIn) {
        // Already logged in, redirect to studio discover page
        return NextResponse.redirect(new URL('/studio/discover', nextUrl.origin))
      }
      return NextResponse.next()
    }

    // 4. Protected routes - require authentication
    if (isProtectedPath(nextUrl.pathname)) {
      if (!isLoggedIn) {
        // Not logged in, redirect to login with callback
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
          callbackUrl += nextUrl.search
        }

        const loginUrl = new URL('/login', nextUrl.origin)
        loginUrl.searchParams.set('callbackUrl', encodeURIComponent(callbackUrl))
        return NextResponse.redirect(loginUrl)
      }
      return NextResponse.next()
    }

    // 5. Default: All other routes are public (marketing pages, landing pages, etc.)
    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname

        // Skip authorization for static assets
        if (isStaticAsset(pathname)) {
          return true
        }

        // Protected routes require authentication
        if (isProtectedPath(pathname)) {
          return !!token
        }

        // All other routes are public by default
        return true
      }
    },
    pages: {
      signIn: '/login',
    },
  }
)

export const config = {
  // Match all routes except API routes and static assets
  matcher: [
    /*
     * Match all request paths except:
     * - API routes (handled separately)
     * - Static assets
     * - Next.js internals
     */
    '/((?!api|_next|_vercel|.*\\..*).*)'
  ]
}