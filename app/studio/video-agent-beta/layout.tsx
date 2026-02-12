"use client"

import type React from "react"
import { useState, useEffect, Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

// 🔥 禁用静态生成（CreateSidebar 使用了 useSearchParams）
export const dynamic = 'force-dynamic'

export default function VideoAgentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [scrolled, setScrolled] = useState(false)
  const isMobile = useIsMobile()

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar scrolled={scrolled} />
      <div className="flex min-h-screen pt-16 w-full overflow-x-hidden">
        {/* Sidebar - Hidden on mobile, shown as tabs instead */}
        {!isMobile && (
          <Suspense fallback={<div className="w-64 flex-shrink-0" />}>
            <CreateSidebar
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />
          </Suspense>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-0 min-w-0 w-full pb-[env(safe-area-inset-bottom)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
