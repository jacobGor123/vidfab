"use client"

import React, { useState, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { CreateTabs } from "./create-tabs"
import { CreateContent } from "./create-content"
import { useIsMobile } from "@/hooks/use-mobile"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "my-assets" | null

export function CreatePageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const isMobile = useIsMobile()

  // 直接从 URL 参数获取当前工具，默认为 "discover"
  const activeTool = (searchParams.get("tool") as ToolType) || "discover"
  const initialPrompt = searchParams.get("prompt") || ""

  // 如果没有 tool 参数，自动设置为 discover
  useEffect(() => {
    if (!searchParams.get("tool")) {
      const params = new URLSearchParams(searchParams.toString())
      params.set("tool", "discover")
      router.replace(`/create?${params.toString()}`)
    }
  }, [searchParams, router])

  const handleToolChange = (tool: ToolType) => {
    const params = new URLSearchParams(searchParams.toString())
    if (tool) {
      params.set("tool", tool)
    } else {
      params.delete("tool")
    }
    router.push(`/create?${params.toString()}`)
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Mobile Tabs */}
      {isMobile && (
        <CreateTabs
          activeTool={activeTool}
          onToolChange={handleToolChange}
        />
      )}

      {/* Content Area */}
      <CreateContent
        activeTool={activeTool}
        onToolChange={handleToolChange}
        initialPrompt={initialPrompt}
      />
    </div>
  )
}