import { Metadata } from 'next'
import AiVideoEffectsClient from './ai-video-effects-client'
import { aiVideoEffectsMetadata } from '@/lib/seo/metadata'
import { StructuredData } from '@/components/seo/structured-data'
import { getServiceSchema } from '@/lib/seo/structured-data'

export const metadata: Metadata = aiVideoEffectsMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function AiVideoEffectsPage() {
  return (
    <>
      <StructuredData data={getServiceSchema({
        name: "AI Video Effects & Transformation",
        description: "Apply stunning AI-powered effects to your videos. Choose from hundreds of professional effects and transformations. One-click video enhancement.",
        serviceType: "AI Video Effects & Enhancement"
      })} />
      <AiVideoEffectsClient />
    </>
  )
}
