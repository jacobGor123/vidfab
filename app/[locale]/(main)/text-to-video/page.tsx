import { Metadata } from 'next'
import TextToVideoClient from './text-to-video-client'
import { textToVideoMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = textToVideoMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function TextToVideoPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return (
    <>
      <StructuredData data={getServiceSchema({
        name: "Text to Video AI Generator",
        description: "Transform your text descriptions into stunning videos using AI. Simply describe what you want, and VidFab will create professional videos in minutes.",
        serviceType: "AI Video Generation"
      })} />
      <TextToVideoClient />
    </>
  )
}
