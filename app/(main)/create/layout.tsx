"use client"

import type React from "react"
import { useState } from "react"
import { CreateSidebar } from "@/components/create/create-sidebar"
import { useIsMobile } from "@/hooks/use-mobile"

export default function CreateLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const isMobile = useIsMobile()

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      <div className="flex h-screen pt-16">
        {/* Sidebar - Hidden on mobile, shown as tabs instead */}
        {!isMobile && (
          <CreateSidebar
            isOpen={sidebarOpen}
            onToggle={() => setSidebarOpen(!sidebarOpen)}
          />
        )}
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}