import { Metadata } from 'next'
import AboutClient from './about-client'
import { aboutMetadata } from '@/lib/seo/metadata'

export const metadata: Metadata = aboutMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default function AboutPage() {
  return <AboutClient />
}
