import { Metadata } from 'next'
import TextToVideoClient from './text-to-video-client'
import { textToVideoMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = textToVideoMetadata

export default function TextToVideoPage() {
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
