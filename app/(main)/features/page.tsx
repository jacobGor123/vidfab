import { Metadata } from 'next'
import FeaturesPageClient from './features-client'
import { featuresMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = featuresMetadata

export default function FeaturesPage() {
  return <FeaturesPageClient />
}
