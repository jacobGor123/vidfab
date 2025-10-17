"use client"

import { useEffect, useState } from "react"

interface HydrationBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * HydrationBoundary - 防止hydration错误的边界组件
 * 确保子组件只在客户端渲染，避免服务端和客户端不匹配
 */
export function HydrationBoundary({ children, fallback = null }: HydrationBoundaryProps) {
  const [isHydrated, setIsHydrated] = useState(false)

  useEffect(() => {
    setIsHydrated(true)
  }, [])

  if (!isHydrated) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * NoSSR - 完全跳过服务端渲染的组件包装器
 * 用于包装完全依赖客户端特性的组件
 */
export function NoSSR({ children, fallback }: HydrationBoundaryProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}