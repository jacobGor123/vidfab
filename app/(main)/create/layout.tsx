"use client"

import type React from "react"
import { useState, Suspense, useEffect } from "react"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { PaymentSuccessHandler } from "@/components/payment-success-handler"
import { useIsMobile } from "@/hooks/use-mobile"
import { isBlackFridayActive } from "@/lib/black-friday/coupons"

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()
  const [bannerVisible, setBannerVisible] = useState(false)

  useEffect(() => {
    // 检查黑五活动是否进行中
    const isActive = isBlackFridayActive()
    if (!isActive) {
      setBannerVisible(false)
      return
    }

    // 检查用户是否关闭了横幅
    const dismissed = localStorage.getItem('bf2025_banner_dismissed')
    setBannerVisible(dismissed !== 'true')
  }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={null}>
        <PaymentSuccessHandler />
      </Suspense>
      <div className={`flex h-screen ${bannerVisible ? 'pt-[112px]' : 'pt-16'}`}>
        {/* Sidebar - Hidden on mobile, shown as tabs instead */}
        {!isMobile && (
          <CreateSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>
    </div>
  )
}