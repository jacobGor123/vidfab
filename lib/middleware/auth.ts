/**
 * Authentication Middleware
 * 统一的认证中间件，消除重复代码
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'

/**
 * 认证上下文
 * 包含请求参数和用户 ID
 */
export interface AuthContext {
  params: any
  userId: string
}

/**
 * 认证的路由处理器类型
 */
export type AuthenticatedHandler = (
  req: NextRequest,
  context: AuthContext
) => Promise<NextResponse<any>>

/**
 * 认证中间件 - 高阶函数包装器
 *
 * 使用方法：
 * ```typescript
 * export const POST = withAuth(async (req, { params, userId }) => {
 *   // 直接使用 userId，无需再次验证
 *   const project = await getProject(params.id, userId)
 *   return NextResponse.json(project)
 * })
 * ```
 *
 * @param handler 需要认证的路由处理器
 * @returns 包装后的路由处理器
 */
export function withAuth(handler: AuthenticatedHandler) {
  return async (
    req: NextRequest,
    context: { params: any }
  ): Promise<NextResponse<any>> => {
    try {
      // 验证用户身份
      const session = await auth()

      if (!session?.user?.uuid) {
        return NextResponse.json(
          { error: 'Authentication required', code: 'AUTH_REQUIRED' },
          { status: 401 }
        )
      }

      // 处理 Promise params (Next.js 14+)
      const params = context.params instanceof Promise
        ? await context.params
        : context.params

      // 调用实际的处理器，传入 userId
      return handler(req, {
        params,
        userId: session.user.uuid
      })
    } catch (error) {
      console.error('[AuthMiddleware] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
}

/**
 * 可选认证中间件
 * 如果用户已登录，则传入 userId，否则为 null
 * 适用于可选登录的 API
 */
export function withOptionalAuth(
  handler: (
    req: NextRequest,
    context: { params: any; userId: string | null }
  ) => Promise<NextResponse<any>>
) {
  return async (
    req: NextRequest,
    context: { params: any }
  ): Promise<NextResponse<any>> => {
    try {
      const session = await auth()
      const userId = session?.user?.uuid || null

      // 处理 Promise params (Next.js 14+)
      const params = context.params instanceof Promise
        ? await context.params
        : context.params

      return handler(req, {
        params,
        userId
      })
    } catch (error) {
      console.error('[AuthMiddleware] Error:', error)
      return NextResponse.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR' },
        { status: 500 }
      )
    }
  }
}
