import { Metadata } from 'next'
import HowItWorksClient from './how-it-works-client'
import { howItWorksMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = howItWorksMetadata

export default function HowItWorksPage() {
  return <HowItWorksClient />
}
