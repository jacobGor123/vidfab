/**
 * Middleware for VidFab AI Video Platform
 * Handles authentication - NextAuth 4.x compatible
 */
import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 🔥 Enable detailed logging for debugging
const DEBUG_AUTH = true;

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/create',
  '/login',
  '/signup',
  '/pricing',
  '/features',
  '/how-it-works',
  '/text-to-video',
  '/image-to-video',
  '/ai-video-effects',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/terms-of-service',
  '/support',
  '/debug-admin', // Admin debug page (public for troubleshooting)
  '/admin', // Admin pages (protected by admin layout's isCurrentUserAdmin() check, not by middleware)
]

// Auth routes that should redirect if already logged in
const authRoutes = ['/login']

// Protected routes that require authentication
const protectedRoutes = [
  '/profile',
  '/settings',
  '/video',
  '/subscription',
  // Note: /admin is NOT in this list - it's protected by admin layout's isCurrentUserAdmin() check
  // This ensures admin auth uses the same method as /debug-admin for consistency
]

function isPublicPath(pathname: string): boolean {
  return (
    // Check exact matches and path prefixes
    publicRoutes.some(route => 
      pathname === route || pathname.startsWith(route + '/')
    ) ||
    // API routes (except protected ones)
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/auth/send-verification-code') ||
    pathname.startsWith('/api/auth/verify-code-login') ||
    // Static assets
    pathname.startsWith('/_next') ||
    pathname.includes('.') // files like favicon.ico, images, etc.
  )
}

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

export default withAuth(
  function middleware(req) {
    const { nextUrl } = req
    const isLoggedIn = !!req.nextauth?.token

    if (DEBUG_AUTH && !nextUrl.pathname.startsWith('/_next/')) {
      console.log('[Middleware] Request:', {
        pathname: nextUrl.pathname,
        hasToken: !!req.nextauth?.token,
        tokenEmail: req.nextauth?.token?.email || 'N/A',
        cookies: req.cookies.getAll().map(c => c.name).join(', ') || 'none',
      });
    }

    // Skip auth checks for API routes and static files
    if (
      nextUrl.pathname.startsWith('/api/') ||
      nextUrl.pathname.startsWith('/_next/') ||
      nextUrl.pathname.includes('.')
    ) {
      return NextResponse.next()
    }

    // Check if it's a public route
    if (isPublicPath(nextUrl.pathname)) {
      if (DEBUG_AUTH) {
        console.log('[Middleware] Public route, allowing:', nextUrl.pathname);
      }
      return NextResponse.next()
    }

    // Check if it's an auth route
    if (isAuthPath(nextUrl.pathname)) {
      if (isLoggedIn) {
        if (DEBUG_AUTH) {
          console.log('[Middleware] Auth route but already logged in, redirecting to /create');
        }
        // Redirect to create page if already logged in
        return NextResponse.redirect(new URL('/create', nextUrl.origin))
      }
      return NextResponse.next()
    }

    // Check if it's a protected route
    if (isProtectedPath(nextUrl.pathname)) {
      if (!isLoggedIn) {
        if (DEBUG_AUTH) {
          console.error('[Middleware] Protected route but not logged in!', {
            pathname: nextUrl.pathname,
            hasToken: !!req.nextauth?.token,
            hasNextAuth: !!req.nextauth,
            cookieNames: req.cookies.getAll().map(c => c.name),
          });
        }
        // Redirect to login with callback URL
        let callbackUrl = nextUrl.pathname
        if (nextUrl.search) {
          callbackUrl += nextUrl.search
        }

        const loginUrl = new URL('/login', nextUrl.origin)
        loginUrl.searchParams.set('callbackUrl', encodeURIComponent(callbackUrl))
        return NextResponse.redirect(loginUrl)
      }
      if (DEBUG_AUTH) {
        console.log('[Middleware] Protected route, user logged in, allowing:', nextUrl.pathname);
      }
      return NextResponse.next()
    }

    return NextResponse.next()
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Allow all public routes
        if (isPublicPath(pathname)) {
          return true
        }

        // Require token for protected routes
        const hasToken = !!token;

        if (DEBUG_AUTH && !pathname.startsWith('/_next/')) {
          console.log('[Middleware authorized callback]:', {
            pathname,
            hasToken,
            tokenEmail: token?.email || 'N/A',
            decision: hasToken ? 'ALLOW' : 'DENY',
          });
        }

        return hasToken;
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