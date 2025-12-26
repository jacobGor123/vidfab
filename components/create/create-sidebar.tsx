"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useIsMobile } from "@/hooks/use-mobile"
import Image from "next/image"

interface CreateSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "video-agent" | "text-to-image" | "image-to-image" | "my-assets" | "my-profile"

// Discover 单独菜单项
const discoverItem = {
  id: "discover" as ToolType,
  label: "Discover",
  iconPath: "/logo/discover.svg"
}

// 其他分类菜单项
const menuCategories = [
  {
    category: "AI Video",
    items: [
      {
        id: "text-to-video" as ToolType,
        label: "Text to Video",
        iconPath: "/logo/text-to-video.svg"
      },
      {
        id: "image-to-video" as ToolType,
        label: "Image to Video",
        iconPath: "/logo/image-to-video.svg"
      },
      {
        id: "video-effects" as ToolType,
        label: "Video Effects",
        iconPath: "/logo/video-effects.svg"
      }
      // 🔥 Video Agent 入口已隐藏
      // {
      //   id: "video-agent" as ToolType,
      //   label: "Video Agent",
      //   iconPath: "/logo/video-agent.svg"
      // }
    ]
  },
  {
    category: "AI Image",
    items: [
      {
        id: "text-to-image" as ToolType,
        label: "Text to Image",
        iconPath: "/logo/text-to-image.svg"
      },
      {
        id: "image-to-image" as ToolType,
        label: "Image to Image",
        iconPath: "/logo/image-to-image.svg"
      }
    ]
  },
  {
    category: "My Works",
    items: [
      {
        id: "my-assets" as ToolType,
        label: "My Assets",
        iconPath: "/logo/my-assets.svg"
      }
    ]
  },
  {
    category: "Account",
    items: [
      {
        id: "my-profile" as ToolType,
        label: "Plans & Billing",
        iconPath: "/logo/plans-&-billing.svg"
      }
    ]
  }
]

export function CreateSidebar({ isOpen, onToggle }: CreateSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const isMobile = useIsMobile()

  // 映射表：tool ID -> /studio 路径（统一管理）
  const urlMap: Record<ToolType, string> = {
    'discover': '/studio/discover',
    'text-to-video': '/studio/text-to-video',
    'image-to-video': '/studio/image-to-video',
    'video-effects': '/studio/ai-video-effects',
    'video-agent': '/studio/video-agent-beta',
    'text-to-image': '/studio/text-to-image',
    'image-to-image': '/studio/image-to-image',
    'my-assets': '/studio/my-assets',
    'my-profile': '/studio/plans',
  }

  // 根据路径判断当前激活的工具（自动反向匹配）
  const getActiveToolFromPath = (): ToolType => {
    // 从路径匹配工具（反向查找）
    for (const [toolId, url] of Object.entries(urlMap)) {
      if (pathname.includes(url)) {
        return toolId as ToolType
      }
    }

    // 兼容旧的 /create?tool=xxx 格式
    const toolParam = searchParams.get("tool") as ToolType
    if (toolParam) return toolParam

    // 默认为 discover
    return 'discover'
  }

  const activeTool = getActiveToolFromPath()

  const handleToolSelect = (toolId: ToolType) => {
    const newUrl = urlMap[toolId]
    // 直接跳转，不保留 query 参数
    router.push(newUrl)
  }

  // 在移动端隐藏侧边栏
  if (isMobile) {
    return null
  }

  return (
    <>
      {/* Sidebar */}
      <div
        className={cn(
          "bg-gray-950 border-r border-gray-800 transition-all duration-300 ease-in-out flex flex-col",
          isOpen ? "w-80" : "w-16"
        )}
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
          {isOpen && (
            <h2 className="text-lg font-semibold text-white">Studio</h2>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="text-gray-400 hover:text-white hover:bg-gray-800"
          >
            {isOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </div>

        {/* Menu Items */}
        <div className="flex-1 overflow-y-auto py-4">
          {/* Discover - 单独菜单项 */}
          <div className="mb-6">
            {(() => {
              const isActive = activeTool === discoverItem.id

              return (
                <button
                  key={discoverItem.id}
                  onClick={() => handleToolSelect(discoverItem.id)}
                  className={cn(
                    "w-full flex items-center text-left px-4 py-3 text-sm transition-all duration-200",
                    "hover:bg-gray-800",
                    isActive
                      ? "bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white border-r-2 border-purple-600"
                      : "text-gray-300"
                  )}
                >
                  <div className={cn(
                    "h-5 w-5 flex-shrink-0 relative",
                    isActive ? "opacity-100" : "opacity-60"
                  )}>
                    <Image
                      src={discoverItem.iconPath}
                      alt={discoverItem.label}
                      width={20}
                      height={20}
                      className="object-contain"
                    />
                  </div>
                  {isOpen && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-medium truncate">{discoverItem.label}</div>
                    </div>
                  )}
                </button>
              )
            })()}
          </div>

          {/* 其他分类菜单项 */}
          {menuCategories.map((category) => (
            <div key={category.category} className="mb-8">
              {isOpen && (
                <div className="px-4 mb-3">
                  <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {category.category}
                  </h3>
                </div>
              )}
              <div className="space-y-1">
                {category.items.map((item) => {
                  const isActive = activeTool === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleToolSelect(item.id)}
                      className={cn(
                        "w-full flex items-center text-left px-4 py-3 text-sm transition-all duration-200",
                        "hover:bg-gray-800",
                        isActive
                          ? "bg-gradient-to-r from-purple-600/20 to-cyan-500/20 text-white border-r-2 border-purple-600"
                          : "text-gray-300"
                      )}
                    >
                      <div className={cn(
                        "h-5 w-5 flex-shrink-0 relative",
                        isActive ? "opacity-100" : "opacity-60"
                      )}>
                        <Image
                          src={item.iconPath}
                          alt={item.label}
                          width={20}
                          height={20}
                          className="object-contain"
                        />
                      </div>
                      {isOpen && (
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        {isOpen && (
          <div className="p-4 border-t border-gray-800">
            <div className="text-xs text-gray-500">
              <p>Create your first masterpiece with AI</p>
            </div>
          </div>
        )}
      </div>
    </>
  )
}