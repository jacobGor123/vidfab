"use client"

/**
 * Auth Modal Hook
 * 管理登录弹框状态，处理登录验证逻辑
 */

import { useState, useCallback, useEffect, useRef } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface UseAuthModalOptions {
  onLoginSuccess?: (user: any) => void
  onLoginCancel?: () => void
  redirectTo?: string
}

interface UseAuthModalReturn {
  isAuthModalOpen: boolean
  showAuthModal: () => void
  hideAuthModal: () => void
  requireAuth: (action: () => void | Promise<void>) => Promise<boolean>
  isAuthenticated: boolean
  user: any
  isLoading: boolean
}

export function useAuthModal(
  options: UseAuthModalOptions = {}
): UseAuthModalReturn {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const pendingActionRef = useRef<(() => void | Promise<void>) | null>(null)

  const { onLoginSuccess, onLoginCancel, redirectTo } = options

  const isAuthenticated = !!session?.user
  const isLoading = status === "loading"

  // 显示登录弹框
  const showAuthModal = useCallback(() => {
    console.log("🔐 显示登录弹框")
    setIsAuthModalOpen(true)
  }, [])

  // 隐藏登录弹框
  const hideAuthModal = useCallback(() => {
    console.log("❌ 隐藏登录弹框")
    setIsAuthModalOpen(false)

    // 如果有待执行的操作且用户取消登录，清理它
    if (pendingActionRef.current) {
      console.log("用户取消登录，清理待执行操作")
      pendingActionRef.current = null
      onLoginCancel?.()
    }
  }, [onLoginCancel])

  // 需要登录时执行操作
  const requireAuth = useCallback(async (
    action: () => void | Promise<void>
  ): Promise<boolean> => {
    // 如果正在加载登录状态，等待
    if (isLoading) {
      console.log("⏳ 等待登录状态检查...")
      return false
    }

    // 如果已经登录，直接执行操作
    if (isAuthenticated) {
      console.log("✅ 用户已登录，执行操作")
      try {
        await action()
        return true
      } catch (error) {
        console.error("执行操作时出错:", error)
        return false
      }
    }

    // 如果未登录，保存操作并显示登录弹框
    console.log("🚫 用户未登录，显示登录弹框")
    pendingActionRef.current = action
    showAuthModal()
    return false
  }, [isLoading, isAuthenticated, showAuthModal])

  // 监听登录状态变化
  useEffect(() => {
    // 如果用户刚登录成功且有待执行操作
    if (session?.user && pendingActionRef.current) {
      console.log("✅ 登录成功，执行待执行操作")

      const action = pendingActionRef.current
      pendingActionRef.current = null

      // 隐藏弹框
      setIsAuthModalOpen(false)

      // 执行操作
      Promise.resolve(action()).then(() => {
        onLoginSuccess?.(session.user)

        // 如果指定了重定向，执行重定向
        if (redirectTo) {
          router.push(redirectTo)
        }
      }).catch(error => {
        console.error("登录后执行操作时出错:", error)
      })
    }
  }, [session?.user, onLoginSuccess, redirectTo, router])

  // 监听弹框外部关闭
  const handleModalClose = useCallback(() => {
    hideAuthModal()
  }, [hideAuthModal])

  return {
    isAuthModalOpen,
    showAuthModal,
    hideAuthModal: handleModalClose,
    requireAuth,
    isAuthenticated,
    user: session?.user,
    isLoading
  }
}

/**
 * 简化的认证检查hook
 * 用于需要登录才能访问的功能
 */
export function useRequireAuth() {
  const { requireAuth, isAuthenticated, isLoading } = useAuthModal()

  const checkAuth = useCallback(async (
    action: () => void | Promise<void>,
    options: {
      errorMessage?: string
      showModal?: boolean
    } = {}
  ): Promise<boolean> => {
    const { errorMessage = "This operation requires login", showModal = true } = options

    if (isLoading) {
      return false
    }

    if (!isAuthenticated) {
      if (showModal) {
        return requireAuth(action)
      } else {
        console.warn(errorMessage)
        return false
      }
    }

    try {
      await action()
      return true
    } catch (error) {
      console.error("操作执行失败:", error)
      return false
    }
  }, [requireAuth, isAuthenticated, isLoading])

  return {
    checkAuth,
    isAuthenticated,
    isLoading
  }
}

/**
 * 用于视频生成功能的认证hook
 */
export function useVideoGenerationAuth() {
  return useAuthModal({
    onLoginSuccess: (user) => {
      console.log(`用户 ${user.email} 登录成功，可以开始生成视频`)
    },
    onLoginCancel: () => {
      console.log("用户取消登录，取消视频生成")
    }
  })
}