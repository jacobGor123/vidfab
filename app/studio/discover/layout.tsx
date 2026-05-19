/**
 * Studio Discover 子路由 layout
 *
 * 与 /studio/video-agent-beta 同款 Navbar + CreateSidebar 容器，
 * 让 /studio/discover 也保留 Studio 工作流的 sidebar 导航。
 */

"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import { useLocale } from "next-intl"
import { Navbar } from "@/components/navbar"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { CreateTabs } from "@/components/create/create-tabs"
import { useIsMobile } from "@/hooks/use-mobile"
import { type ToolType, toolToUrlMap } from "@/lib/config/studio-tools"
import { defaultLocale } from "@/i18n/locale"

export const dynamic = 'force-dynamic'

export default function StudioDiscoverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleToolChange = (tool: ToolType) => {
    const url = toolToUrlMap[tool]
    if (url) router.push(`${localePrefix}${url}`)
  }

  return (
    <div className="h-screen bg-black text-white overflow-hidden">
      <Navbar scrolled={scrolled} />
      <div className="flex h-[calc(100vh-4rem)] w-full overflow-hidden mt-16">
        {!isMobile && (
          <Suspense fallback={<div className="w-64 flex-shrink-0" />}>
            <CreateSidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </Suspense>
        )}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full pb-[env(safe-area-inset-bottom)] overflow-y-auto overflow-x-hidden">
          {/* Mobile 顶部工具切换 tabs — 与 /create 路由保持一致 */}
          {isMobile && (
            <CreateTabs activeTool="discover" onToolChange={handleToolChange} />
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
