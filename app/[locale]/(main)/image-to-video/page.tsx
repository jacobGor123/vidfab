import { Metadata } from 'next'
import ImageToVideoClient from './image-to-video-client'
import { imageToVideoMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = imageToVideoMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function ImageToVideoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <StructuredData data={getServiceSchema({
        name: "Image to Video AI Converter",
        description: "Convert your images into dynamic videos with AI. Upload your photos and let VidFab bring them to life with stunning animations and effects.",
        serviceType: "AI Image to Video Conversion"
      })} />
      <ImageToVideoClient />
    </>
  )
}
