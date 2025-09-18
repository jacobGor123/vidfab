"use client"

import { TextToVideoPanelEnhanced } from "./text-to-video-panel-new"
import { ImageToVideoPanelEnhanced } from "./image-to-video-panel"
import { TemplateGallery } from "./template-gallery"
import { MyAssets } from "./my-assets"
import { EmptyState } from "./empty-state"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "my-assets" | null

interface CreateContentProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
}

export function CreateContent({ activeTool, onToolChange }: CreateContentProps) {
  const renderContent = () => {
    switch (activeTool) {
      case "discover":
        return <TemplateGallery />
      case "text-to-video":
        return <TextToVideoPanelEnhanced />
      case "image-to-video":
        return <ImageToVideoPanelEnhanced />
      case "my-assets":
        return <MyAssets />
      default:
        return <TemplateGallery />
    }
  }

  return (
    <div className="flex-1 bg-black">
      {renderContent()}
    </div>
  )
}