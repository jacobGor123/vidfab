import { Metadata } from 'next'
import ImageToVideoClient from './image-to-video-client'
import { imageToVideoMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = imageToVideoMetadata

export default function ImageToVideoPage() {
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
