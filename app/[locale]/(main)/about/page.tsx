import { Metadata } from 'next'
import AboutClient from './about-client'
import { aboutMetadata, localizedMetadata } from '@/lib/seo/metadata'
import { setRequestLocale } from 'next-intl/server'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  return localizedMetadata(aboutMetadata, '/about', locale)
}

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <AboutClient />
}
