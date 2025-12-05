import { Metadata } from 'next'
import HomeClient from './home-client'
import { homeMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = homeMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function HomePage() {
  return <HomeClient />
}
