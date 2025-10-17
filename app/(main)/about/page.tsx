import { Metadata } from 'next'
import AboutClient from './about-client'
import { aboutMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = aboutMetadata

export default function AboutPage() {
  return <AboutClient />
}
