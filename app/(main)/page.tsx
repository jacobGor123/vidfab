import { Metadata } from 'next'
import HomeClient from './home-client'
import { homeMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = homeMetadata

export default function HomePage() {
  return <HomeClient />
}
