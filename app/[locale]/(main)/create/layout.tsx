"use client"

import type React from "react"
import { useState, Suspense } from "react"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { PaymentSuccessHandler } from "@/components/payment-success-handler"
import { useIsMobile } from "@/hooks/use-mobile"
// import { isBlackFridayActive } from "@/lib/black-friday/coupons" // 黑五活动已结束

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()
  // const [bannerVisible, setBannerVisible] = useState(false) // 黑五活动已结束

  // 黑五活动相关逻辑已移除
  // useEffect(() => {
  //   const isActive = isBlackFridayActive()
  //   if (!isActive) {
  //     setBannerVisible(false)
  //     return
  //   }
  //   const dismissed = localStorage.getItem('bf2025_banner_dismissed')
  //   setBannerVisible(dismissed !== 'true')
  // }, [])

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <Suspense fallback={null}>
        <PaymentSuccessHandler />
      </Suspense>
      <div className="flex h-screen pt-16">
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