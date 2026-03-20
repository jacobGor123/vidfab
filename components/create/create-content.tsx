"use client"

import { TextToVideoPanelEnhanced } from "./text-to-video-panel-new"
import { ImageToVideoPanelEnhanced } from "./image-to-video-panel"
import { VideoEffectsPanel } from "./video-effects-panel"
import { TextToImagePanel } from "./image/text-to-image-panel"
import { ImageToImagePanel } from "./image/image-to-image-panel"
import { TemplateGallery } from "./template-gallery"
import { MyAssets } from "./my-assets"
import { MyProfilePanel } from "./my-profile-panel"
import { type ToolType } from "@/lib/config/studio-tools"
import { useLocale } from "next-intl"
import { defaultLocale } from "@/i18n/locale"

interface CreateContentProps {
  activeTool: ToolType
  onToolChange: (tool: ToolType) => void
  initialPrompt?: string
}

export function CreateContent({ activeTool, onToolChange, initialPrompt }: CreateContentProps) {
  const locale = useLocale()
  const localePrefix = locale === defaultLocale ? '' : `/${locale}`

  const renderContent = () => {
    switch (activeTool) {
      case "discover":
        return <TemplateGallery />
      case "story-to-video":
        // Story-to-Video 有独立的页面 /studio/video-agent-beta，跳转时携带 locale
        if (typeof window !== 'undefined') {
          window.location.href = `${localePrefix}/studio/video-agent-beta`
        }
        return null
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
    <div className="flex-1 bg-black h-full min-h-0">
      {renderContent()}
    </div>
  )
}