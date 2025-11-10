"use client"

import { cn } from "@/lib/utils"
import { Type, ImageIcon, Search, FolderOpen, Sparkles, User, Video, Image, Palette } from "lucide-react"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "text-to-image" | "image-to-image" | "my-assets" | "my-profile" | null

interface CreateTabsProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
}

const tabs = [
  {
    id: "discover" as ToolType,
    label: "Discover",
    icon: Search,
    shortLabel: "Discover"
  },
  {
    id: "text-to-video" as ToolType,
    label: "Text to Video",
    icon: Type,
    shortLabel: "T2V"
  },
  {
    id: "image-to-video" as ToolType,
    label: "Image to Video",
    icon: Video,
    shortLabel: "I2V"
  },
  {
    id: "video-effects" as ToolType,
    label: "Video Effects",
    icon: Sparkles,
    shortLabel: "Effects"
  },
  {
    id: "text-to-image" as ToolType,
    label: "Text to Image",
    icon: Image,
    shortLabel: "T2I"
  },
  {
    id: "image-to-image" as ToolType,
    label: "Image to Image",
    icon: Palette,
    shortLabel: "I2I"
  },
  {
    id: "my-assets" as ToolType,
    label: "My Assets",
    icon: FolderOpen,
    shortLabel: "Assets"
  },
  {
    id: "my-profile" as ToolType,
    label: "Plans & Billing",
    icon: User,
    shortLabel: "Billing"
  }
]

export function CreateTabs({ activeTool, onToolChange }: CreateTabsProps) {
  return (
    <div className="bg-gray-950 border-b border-gray-800">
      <div className="flex">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTool === tab.id
          
          return (
            <button
              key={tab.id}
              onClick={() => onToolChange(tab.id)}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-3 px-2 text-xs transition-all duration-200",
                "hover:bg-gray-800",
                isActive 
                  ? "text-white bg-gradient-to-b from-purple-600/20 to-cyan-500/20 border-b-2 border-purple-600" 
                  : "text-gray-400"
              )}
            >
              <Icon className={cn(
                "h-5 w-5 mb-1",
                isActive ? "text-purple-600" : "text-gray-400"
              )} />
              <span className="font-medium">{tab.shortLabel}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}