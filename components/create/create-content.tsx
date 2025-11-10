"use client"

import { TextToVideoPanelEnhanced } from "./text-to-video-panel-new"
import { ImageToVideoPanelEnhanced } from "./image-to-video-panel"
import { VideoEffectsPanel } from "./video-effects-panel"
import { TextToImagePanel } from "./image/text-to-image-panel"
import { ImageToImagePanel } from "./image/image-to-image-panel"
import { TemplateGallery } from "./template-gallery"
import { MyAssets } from "./my-assets"
import { MyProfilePanel } from "./my-profile-panel"

type ToolType = "discover" | "text-to-video" | "image-to-video" | "video-effects" | "text-to-image" | "image-to-image" | "my-assets" | "my-profile" | null

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
      case "text-to-image":
        return <TextToImagePanel />
      case "image-to-image":
        return <ImageToImagePanel />
      case "my-assets":
        return <MyAssets />
      case "my-profile":
        return <MyProfilePanel />
      default:
        return <TemplateGallery />
    }
  }

  return (
    <div className="flex-1 bg-black h-full overflow-hidden">
      {renderContent()}
    </div>
  )
}