import { Metadata } from 'next'
import ImageToImageClient from './image-to-image-client'
import { imageToImageMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = imageToImageMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function ImageToImagePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <StructuredData data={getServiceSchema({
        name: "Image to Image AI Transformer",
        description: "Reimagine your visuals with AI-powered image transformation. Upload your images and let VidFab create new artistic variations instantly.",
        serviceType: "AI Image Transformation"
      })} />
      <ImageToImageClient />
    </>
  )
}
