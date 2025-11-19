import { Metadata } from 'next'
import TextToImageClient from './text-to-image-client'
import { textToImageMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = textToImageMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function TextToImagePage() {
  return (
    <>
      <StructuredData data={getServiceSchema({
        name: "Text to Image AI Generator",
        description: "Transform your text descriptions into stunning images using AI. Simply describe what you want, and VidFab will create unique visuals instantly.",
        serviceType: "AI Image Generation"
      })} />
      <TextToImageClient />
    </>
  )
}
