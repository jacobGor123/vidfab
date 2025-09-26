"use client"

import { TextToVideoPanelEnhanced } from "./text-to-video-panel-new"
import { ImageToVideoPanelEnhanced } from "./image-to-video-panel"
import { VideoEffectsPanel } from "./video-effects-panel"
import { TemplateGallery } from "./template-gallery"
import { MyAssets } from "./my-assets"
import { EmptyState } from "./empty-state"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "my-assets" | null

interface CreateContentProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  initialPrompt?: string
}

export function CreateContent({ activeTool, onToolChange, initialPrompt }: CreateContentProps) {
  const renderContent = () => {
    switch (activeTool) {
      case "discover":
        return <TemplateGallery />
      case "text-to-video":
        return <TextToVideoPanelEnhanced initialPrompt={initialPrompt} />
      case "image-to-video":
        return <ImageToVideoPanelEnhanced />
      case "video-effects":
        return <VideoEffectsPanel />
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