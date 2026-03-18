import { Metadata } from 'next'
import AboutClient from './about-client'
import { aboutMetadata } from '@/lib/seo/metadata'
import { setRequestLocale } from 'next-intl/server'

export const metadata: Metadata = aboutMetadata

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AboutClient />
}
