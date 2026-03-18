import HomeClient from './home-client'
import { setRequestLocale, getTranslations } from 'next-intl/server'
import { getAlternateLinks } from '@/lib/seo/alternate-links'

// 🔥 强制动态渲染，避免预渲染时 usePathname 错误
export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations({ locale, namespace: 'home' })
  return {
    title: t('meta.title'),
    description: t('meta.description'),
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_BASE_URL || 'https://vidfab.ai'}${locale === 'en' ? '' : '/' + locale}/`,
      languages: getAlternateLinks('/'),
    },
  }
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <HomeClient />
}
