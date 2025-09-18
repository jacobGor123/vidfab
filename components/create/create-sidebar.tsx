"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { 
  ChevronLeft, 
  ChevronRight,
  Video, 
  Image, 
  Search, 
  FolderOpen,
  Type,
  ImageIcon
} from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

interface CreateSidebarProps {
  isOpen: boolean
  onToggle: () => void
}

type ToolType = "discover" | "text-to-video" | "image-to-video" | "my-assets"

// Discover 单独菜单项
const discoverItem = {
  id: "discover" as ToolType,
  label: "Discover",
  icon: Search,
  description: "Browse video templates and inspiration"
}

// 其他分类菜单项
const menuCategories = [
  {
    category: "Tools",
    items: [
      {
        id: "text-to-video" as ToolType,
        label: "Text to Video",
        icon: Type,
        description: "Generate videos from text descriptions"
      },
      {
        id: "image-to-video" as ToolType,
        label: "Image to Video", 
        icon: ImageIcon,
        description: "Convert images to video sequences"
      }
    ]
  },
  {
    category: "My Works",
    items: [
      {
        id: "my-assets" as ToolType,
        label: "My Assets",
        icon: FolderOpen,
        description: "Manage your video creations"
      }
    ]
  }
]

export function CreateSidebar({ isOpen, onToggle }: CreateSidebarProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  // 默认为 "discover"，与页面逻辑保持一致
  const activeTool = (searchParams.get("tool") as ToolType) || "discover"

  const handleToolSelect = (toolId: ToolType) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("tool", toolId)
    router.push(`/create?${params.toString()}`)
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
              const Icon = discoverItem.icon
              
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
                  <Icon className={cn(
                    "h-5 w-5 flex-shrink-0",
                    isActive ? "text-purple-600" : "text-gray-400"
                  )} />
                  {isOpen && (
                    <div className="ml-3 flex-1 min-w-0">
                      <div className="font-medium truncate">{discoverItem.label}</div>
                      <div className="text-xs text-gray-500 truncate">{discoverItem.description}</div>
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
                  const Icon = item.icon
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
                      <Icon className={cn(
                        "h-5 w-5 flex-shrink-0",
                        isActive ? "text-purple-600" : "text-gray-400"
                      )} />
                      {isOpen && (
                        <div className="ml-3 flex-1 min-w-0">
                          <div className="font-medium truncate">{item.label}</div>
                          <div className="text-xs text-gray-500 truncate">{item.description}</div>
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