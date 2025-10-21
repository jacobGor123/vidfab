/**
 * Debug endpoint to check OAuth configuration
 * Access: https://vidfab.ai/api/debug-auth
 */
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const headers = Object.fromEntries(request.headers.entries());

  const debugInfo = {
    timestamp: new Date().toISOString(),

    // 环境变量
    env: {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ?
        process.env.AUTH_GOOGLE_ID.substring(0, 20) + '...' : 'NOT SET',
      NEXT_PUBLIC_AUTH_GOOGLE_ENABLED: process.env.NEXT_PUBLIC_AUTH_GOOGLE_ENABLED,
      NODE_ENV: process.env.NODE_ENV,
    },

    // 请求信息
    request: {
      url: request.url,
      method: request.method,
      protocol: url.protocol,
      host: url.host,
      hostname: url.hostname,
      origin: url.origin,
    },

    // Headers (反向代理信息)
    headers: {
      host: headers['host'],
      'x-forwarded-host': headers['x-forwarded-host'],
      'x-forwarded-proto': headers['x-forwarded-proto'],
      'x-forwarded-for': headers['x-forwarded-for'],
      'x-real-ip': headers['x-real-ip'],
    },

    // 计算出的回调 URL
    computed: {
      actualCallbackUrl: `${url.protocol}//${headers['x-forwarded-host'] || headers['host']}/api/auth/callback/google`,
      expectedCallbackUrl: `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
      match: `${url.protocol}//${headers['x-forwarded-host'] || headers['host']}/api/auth/callback/google` ===
             `${process.env.NEXTAUTH_URL}/api/auth/callback/google`,
    }
  };

  return NextResponse.json(debugInfo, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
    }
  });
}
