import { Metadata } from 'next'
import PrivacyClient from './privacy-client'
import { privacyMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = privacyMetadata

export default function PrivacyPage() {
  return <PrivacyClient />
}
