/**
 * Subscription Layout
 * Forces dynamic rendering for all subscription pages
 */

import type React from "react"

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function SubscriptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
