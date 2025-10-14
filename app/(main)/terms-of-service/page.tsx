import { Metadata } from 'next'
import TermsClient from './terms-client'
import { termsOfServiceMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = termsOfServiceMetadata

export default function TermsOfServicePage() {
  return <TermsClient />
}
