/**
 * 清除用户session API - 强制重新登录
 * 用于修复JWT token与数据库不匹配的问题
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin/auth';

export async function POST(req: NextRequest) {
  // 安全检查：仅在开发环境运行
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: 'This endpoint is only available in development' },
      { status: 403 }
    );
  }

  try {
    await requireAdmin();

    console.log('🔧 清除用户session...');

    // NextAuth session cookies to clear
    const sessionCookies = [
      'next-auth.session-token',
      'next-auth.csrf-token',
      'next-auth.callback-url',
      'next-auth.pkce.code_verifier',
      '__Secure-next-auth.session-token',
      '__Secure-next-auth.csrf-token',
      '__Host-next-auth.csrf-token'
    ];

    // Create response with cleared cookies
    const response = NextResponse.json({
      success: true,
      message: '用户session已清除',
      cleared_cookies: sessionCookies,
      note: '用户需要重新登录以获取正确的JWT token'
    });

    // Clear all session cookies
    sessionCookies.forEach(cookieName => {
      response.cookies.set(cookieName, '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0 // Expire immediately
      });
    });

    console.log('✅ Session cookies已清除:', sessionCookies);

    return response;

  } catch (error: any) {
    console.error('清除session失败:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clear session',
      details: error.message
    }, { status: error.status || 500 });
  }
}

export async function GET() {
  try {
    await requireAdmin();

    return NextResponse.json({
      message: 'Clear session endpoint',
      usage: 'POST to clear user session cookies',
      description: '清除用户session，强制重新登录以修复JWT token不匹配问题',
      environment: process.env.NODE_ENV,
      available: process.env.NODE_ENV === 'development'
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Unauthorized' },
      { status: error.status || 500 }
    );
  }
}
